import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { InjectRedis } from '../../infra/redis/redis.module.js';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const [db, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(
        () => 'up',
        () => 'down',
      ),
      this.redis.ping().then(
        () => 'up',
        () => 'down',
      ),
    ]);
    const status = {
      status: db === 'up' && redis === 'up' ? 'ok' : 'error',
      db,
      redis,
    };
    if (status.status !== 'ok') throw new ServiceUnavailableException(status);
    return status;
  }
}
