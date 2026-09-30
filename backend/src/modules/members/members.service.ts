import { Injectable } from '@nestjs/common';
import { notFound } from '../../common/errors.js';
import { paginate } from '../../common/pagination/pagination.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PasswordService } from '../auth/password.service.js';
import { PoliciesService } from '../policies/policies.service.js';
import type {
  CreateMemberDto,
  MemberQuery,
  UpdateMemberDto,
} from './dto/member.dto.js';

export const memberSelect = {
  id: true,
  memberCode: true,
  idNumber: true,
  type: true,
  classOrMajor: true,
  phone: true,
  status: true,
  validUntil: true,
  emailReminders: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
} as const;

type MemberRow = Prisma.MemberGetPayload<{ select: typeof memberSelect }>;

export const presentMember = ({ user, ...m }: MemberRow) => ({
  ...m,
  userId: user.id,
  name: user.name,
  email: user.email,
  lastLoginAt: user.lastLoginAt,
  // foto anggota belum diaktifkan (data minimization anak di bawah umur)
  photoUrl: null,
});

type Db = Prisma.TransactionClient;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly policies: PoliciesService,
    private readonly audit: AuditService,
  ) {}

  list(q: MemberQuery) {
    const where: Prisma.MemberWhereInput = {
      type: q.type,
      status: q.status,
      classOrMajor: q.classOrMajor
        ? { equals: q.classOrMajor, mode: 'insensitive' }
        : undefined,
      OR: q.q
        ? [
            { user: { name: { contains: q.q, mode: 'insensitive' } } },
            { idNumber: { contains: q.q } },
            { memberCode: { contains: q.q.toUpperCase() } },
          ]
        : undefined,
    };
    return paginate(
      q,
      async (p) =>
        (
          await this.prisma.member.findMany({
            where,
            select: memberSelect,
            orderBy: { user: { name: 'asc' } },
            ...p,
          })
        ).map(presentMember),
      () => this.prisma.member.count({ where }),
    );
  }

  /** MemberSummary: data anggota + angka panel meja layanan (datar). */
  async get(id: string) {
    const m = await this.prisma.member.findUnique({
      where: { id },
      select: memberSelect,
    });
    if (!m) throw notFound('Anggota');
    return { ...presentMember(m), ...(await this.summary(m.id, m.type)) };
  }

  /** Panel meja layanan: scan kartu (member code) atau ketik nomor induk. */
  async lookup(code: string) {
    const m = await this.prisma.member.findFirst({
      where: { OR: [{ memberCode: code.toUpperCase() }, { idNumber: code }] },
      select: { id: true },
    });
    if (!m) throw notFound('Anggota');
    return this.get(m.id);
  }

  async summary(memberId: string, type: CreateMemberDto['type']) {
    const [policy, activeLoans, overdueLoans, activeHolds, readyHolds, fines] =
      await Promise.all([
        this.policies.get(type),
        this.prisma.loan.count({ where: { memberId, returnedAt: null } }),
        this.prisma.loan.count({
          where: { memberId, returnedAt: null, dueAt: { lt: new Date() } },
        }),
        this.prisma.hold.count({
          where: { memberId, status: { in: ['WAITING', 'READY'] } },
        }),
        this.prisma.hold.count({ where: { memberId, status: 'READY' } }),
        this.prisma.fine.aggregate({
          where: { loan: { memberId }, status: 'UNPAID' },
          _sum: { amount: true, paidAmount: true },
        }),
      ]);
    return {
      activeLoans,
      maxActiveLoans: policy.maxActiveLoans,
      overdueLoans,
      activeHolds,
      readyHolds,
      unpaidFines: (fines._sum.amount ?? 0) - (fines._sum.paidAmount ?? 0),
      blockingFineThreshold: policy.blockingFineThreshold,
      loanDays: policy.loanDays,
    };
  }

  async create(actorId: string, dto: CreateMemberDto) {
    const temporaryPassword = this.passwords.temporary();
    const passwordHash = await this.passwords.hash(temporaryPassword);
    const member = await this.prisma.$transaction((tx) =>
      this.insert(tx, dto, passwordHash),
    );
    await this.audit.log({
      actorId,
      action: 'member.create',
      entityType: 'Member',
      entityId: member.id,
    });
    return { ...presentMember(member), temporaryPassword };
  }

  /** Dipakai juga oleh import CSV. Password sementara, wajib ganti saat login pertama. */
  async insert(tx: Db, dto: CreateMemberDto, passwordHash: string) {
    const [{ seq }] = await tx.$queryRaw<
      { seq: bigint }[]
    >`SELECT nextval('member_code_seq') AS seq`;
    return tx.member.create({
      data: {
        memberCode: `AGT-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`,
        idNumber: dto.idNumber,
        type: dto.type,
        classOrMajor: dto.classOrMajor ?? null,
        phone: dto.phone ?? null,
        status: dto.status,
        validUntil: new Date(dto.validUntil),
        user: {
          create: {
            name: dto.name,
            email: dto.email ?? null,
            role: 'MEMBER',
            passwordHash,
            mustChangePassword: true,
          },
        },
      },
      select: memberSelect,
    });
  }

  async update(actorId: string, id: string, dto: UpdateMemberDto) {
    const { name, email, validUntil, ...rest } = dto;
    const current = await this.prisma.member.findUnique({ where: { id } });
    if (!current) throw notFound('Anggota');
    // perpanjang masa berlaku mengaktifkan kembali anggota EXPIRED
    const reactivate =
      current.status === 'EXPIRED' &&
      !rest.status &&
      validUntil &&
      new Date(validUntil) > new Date();
    const member = await this.prisma.member.update({
      where: { id },
      data: {
        ...rest,
        status: reactivate ? 'ACTIVE' : rest.status,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        user:
          name !== undefined || email !== undefined
            ? { update: { name, email } }
            : undefined,
      },
      select: memberSelect,
    });
    await this.audit.log({
      actorId,
      action: 'member.update',
      entityType: 'Member',
      entityId: id,
      metadata: dto,
    });
    return presentMember(member);
  }

  /** Job harian: anggota yang lewat masa berlaku jadi EXPIRED. */
  async expireOverdueMemberships() {
    const { count } = await this.prisma.member.updateMany({
      where: { status: 'ACTIVE', validUntil: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    return count;
  }
}
