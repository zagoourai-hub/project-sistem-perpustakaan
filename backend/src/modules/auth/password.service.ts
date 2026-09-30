import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

@Injectable()
export class PasswordService {
  hash(plain: string) {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  verify(hash: string, plain: string) {
    return argon2.verify(hash, plain).catch(() => false);
  }

  /** Password sementara untuk reset oleh staf / akun hasil import. */
  temporary() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const body = Array.from(
      { length: 9 },
      () => chars[randomInt(chars.length)],
    ).join('');
    return `${body}${randomInt(10)}`;
  }
}
