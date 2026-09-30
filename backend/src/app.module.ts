import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { createObserveModule } from '@nestjs/observe';
import {
  HttpExceptionFilter,
  validationException,
} from './common/filters/http-exception.filter.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { throttlerConfig } from './common/guards/throttler.config.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { validateEnv } from './infra/config/env.schema.js';
import { LoggerModule } from './infra/logger/logger.module.js';
import { MailModule } from './infra/mail/mail.module.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { QueueModule } from './infra/queue/queue.module.js';
import { RedisModule } from './infra/redis/redis.module.js';
import { StorageModule } from './infra/storage/storage.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { CirculationModule } from './modules/circulation/circulation.module.js';
import { FinesModule } from './modules/fines/fines.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { HoldsModule } from './modules/holds/holds.module.js';
import { ItemsModule } from './modules/items/items.module.js';
import { MeModule } from './modules/me/me.module.js';
import { MembersModule } from './modules/members/members.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PoliciesModule } from './modules/policies/policies.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrivacyModule } from './modules/privacy/privacy.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Distributed tracing & error telemetry. Isi appKey/appSecret dari https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    LoggerModule,
    ThrottlerModule.forRoot(throttlerConfig),
    PrismaModule,
    RedisModule,
    QueueModule,
    StorageModule,
    MailModule,
    AuditModule,
    AuthModule,
    UsersModule,
    MembersModule,
    SettingsModule,
    PoliciesModule,
    CatalogModule,
    ItemsModule,
    NotificationsModule,
    HoldsModule,
    FinesModule,
    CirculationModule,
    AiModule,
    SearchModule,
    MeModule,
    ReportsModule,
    HealthModule,
    PrivacyModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new StandardSchemaValidationPipe({
        exceptionFactory: validationException,
      }),
    },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // urutan penting: rate limit → auth → role → csrf
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
