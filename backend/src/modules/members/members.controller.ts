import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Staff } from '../../common/decorators/roles.decorator.js';
import { unprocessable } from '../../common/errors.js';
import { LoanPresenter } from '../catalog/loan.presenter.js';
import { UsersService } from '../users/users.service.js';
import {
  type CreateMemberDto,
  createMemberSchema,
  lookupSchema,
  type MemberQuery,
  memberQuerySchema,
  type UpdateMemberDto,
  updateMemberSchema,
} from './dto/member.dto.js';
import {
  IMPORT_COLUMNS,
  MemberImportService,
} from './member-import.service.js';
import { MembersService } from './members.service.js';

const importQuerySchema = z.object({ dryRun: z.stringbool().default(false) });

@Staff()
@Controller('members')
export class MembersController {
  constructor(
    private readonly members: MembersService,
    private readonly importer: MemberImportService,
    private readonly users: UsersService,
    private readonly loanPresenter: LoanPresenter,
  ) {}

  @Get()
  list(@Query({ schema: memberQuerySchema }) q: MemberQuery) {
    return this.members.list(q);
  }

  /** Scan QR kartu / ketik nomor induk di meja layanan. */
  @Get('lookup')
  lookup(@Query({ schema: lookupSchema }) q: { code: string }) {
    return this.members.lookup(q.code);
  }

  @Get('import/template')
  importTemplate() {
    return {
      columns: IMPORT_COLUMNS,
      example: 'Budi Santoso,12345,SISWA,XI IPA 1,,,2027-06-30',
    };
  }

  @Post('import')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  import(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query({ schema: importQuerySchema }) q: z.infer<typeof importQuerySchema>,
  ) {
    if (!file)
      throw unprocessable(
        'FILE_REQUIRED',
        'File CSV wajib diunggah (field "file")',
      );
    return this.importer.import(user.id, file.buffer, q.dryRun);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createMemberSchema }) dto: CreateMemberDto,
  ) {
    return this.members.create(user.id, dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.members.get(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: updateMemberSchema }) dto: UpdateMemberDto,
  ) {
    return this.members.update(user.id, id, dto);
  }

  @Get(':id/loans')
  /** Pinjaman aktif (panel meja layanan "Sedang dipinjam"). */
  loans(@Param('id') id: string) {
    return this.loanPresenter.list({ memberId: id, returnedAt: null });
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  async resetPassword(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const m = await this.members.get(id);
    return this.users.resetPassword(user.id, m.userId);
  }
}
