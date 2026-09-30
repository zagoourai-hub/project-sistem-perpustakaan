import type { ThrottlerModuleOptions } from '@nestjs/throttler';

// ponytail: storage in-memory per proses; ganti ke storage Redis bila backend di-scale > 1 instance.
export const throttlerConfig: ThrottlerModuleOptions = [
  { name: 'default', ttl: 60_000, limit: 300 },
];
