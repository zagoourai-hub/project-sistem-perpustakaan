import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema.js';

export const LOCAL_UPLOAD_DIR = resolve('uploads');

/**
 * Object storage. Driver `local` (development) menulis ke folder `uploads/`
 * yang disajikan Express di `/uploads`; driver `s3` untuk MinIO/S3 di production.
 */
@Injectable()
export class StorageService {
  private readonly s3?: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    if (config.get('STORAGE_DRIVER', { infer: true }) === 's3') {
      const endpoint = config.get('S3_ENDPOINT', { infer: true });
      this.publicBase =
        config.get('S3_PUBLIC_URL', { infer: true }) ??
        `${endpoint}/${this.bucket}`;
      this.s3 = new S3Client({
        endpoint,
        region: config.get('S3_REGION', { infer: true }),
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
          secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
        },
      });
    } else {
      this.publicBase = `${config.get('PUBLIC_API_URL', { infer: true })}/uploads`;
    }
  }

  async upload(key: string, body: Buffer, contentType: string) {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } else {
      const path = this.localPath(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
    }
    return key;
  }

  async delete(key: string) {
    if (this.s3)
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    else await rm(this.localPath(key), { force: true });
  }

  publicUrl(key: string | null | undefined) {
    return key ? `${this.publicBase}/${key}` : null;
  }

  private localPath(key: string) {
    const path = resolve(LOCAL_UPLOAD_DIR, key);
    if (!path.startsWith(LOCAL_UPLOAD_DIR))
      throw new Error('Key storage tidak valid');
    return path;
  }
}
