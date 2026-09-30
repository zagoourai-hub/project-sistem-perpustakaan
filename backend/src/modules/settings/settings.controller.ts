import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { unprocessable } from '../../common/errors.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  SettingsService,
  type UpdateLibraryProfile,
  updateLibraryProfileSchema,
} from './settings.service.js';

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Profil perpustakaan untuk header OPAC/portal & halaman masuk. */
  @Public()
  @Get('public')
  async getPublic() {
    const { historyRetentionYears: _, ...rest } = this.settings.present(
      await this.settings.get(),
    );
    return rest;
  }

  @Roles('ADMIN')
  @Get()
  async getAdmin() {
    return this.settings.present(await this.settings.get());
  }

  @Roles('ADMIN')
  @Patch()
  async update(
    @CurrentUser() user: AuthUser,
    @Body({ schema: updateLibraryProfileSchema }) dto: UpdateLibraryProfile,
  ) {
    const result = await this.settings.update(dto);
    await this.audit.log({
      actorId: user.id,
      action: 'settings.update',
      entityType: 'Setting',
      entityId: 'library',
      metadata: dto,
    });
    return result;
  }

  @Roles('ADMIN')
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1024 * 1024 } }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File | undefined) {
    const ext = file && IMAGE_TYPES[file.mimetype];
    if (!file || !ext)
      throw unprocessable('INVALID_FILE', 'Logo harus JPEG/PNG/WebP maks 1 MB');
    const old = (await this.settings.get()).logoKey;
    const key = await this.storage.upload(
      `branding/logo-${randomUUID()}.${ext}`,
      file.buffer,
      file.mimetype,
    );
    if (old) await this.storage.delete(old).catch(() => undefined);
    return this.settings.update({ logoKey: key });
  }
}
