import { AuthService } from './auth.service.js';

/** Redis in-memory minimal untuk logika throttle login. */
function fakeRedis() {
  const store = new Map<string, number>();
  return {
    store,
    get: vi.fn(async (k: string) =>
      store.has(k) ? String(store.get(k)) : null,
    ),
    ttl: vi.fn(async () => 600),
    del: vi.fn(async (k: string) => store.delete(k)),
    multi: () => {
      const ops: (() => void)[] = [];
      const chain = {
        incr: (k: string) => (
          ops.push(() => store.set(k, (store.get(k) ?? 0) + 1)),
          chain
        ),
        expire: () => chain,
        exec: async () => ops.forEach((op) => op()),
      };
      return chain;
    },
  };
}

const user = {
  id: 'u1',
  name: 'Admin',
  email: 'admin@x.id',
  role: 'ADMIN' as const,
  mustChangePassword: false,
  member: null,
  passwordHash: 'hash',
};

function setup(found: typeof user | null, passwordOk: boolean) {
  const redis = fakeRedis();
  const prisma = {
    user: {
      findFirst: vi.fn(async () => found),
      update: vi.fn(async () => found),
    },
  };
  const passwords = { verify: vi.fn(async () => passwordOk) };
  const tokens = {
    signAccess: vi.fn(async () => 'access'),
    issueRefresh: vi.fn(async () => ({ raw: 'refresh', id: 'r1' })),
  };
  const audit = { log: vi.fn(async () => undefined) };
  const service = new AuthService(
    prisma as never,
    passwords as never,
    tokens as never,
    audit as never,
    redis as never,
  );
  return { service, redis, tokens };
}

describe('AuthService.login', () => {
  it('sukses: menerbitkan token, tanpa passwordHash di profil', async () => {
    const { service } = setup(user, true);
    const r = await service.login(
      { identifier: 'ADMIN@x.id', password: 'x' },
      '1.1.1.1',
    );
    expect(r.accessToken).toBe('access');
    expect(r.refreshToken).toBe('refresh');
    expect(r.profile).not.toHaveProperty('passwordHash');
  });

  it('password salah → INVALID_CREDENTIALS, user tak dikenal → pesan yang sama', async () => {
    await expect(
      setup(user, false).service.login(
        { identifier: 'a', password: 'x' },
        'ip',
      ),
    ).rejects.toMatchObject({
      errorCode: 'INVALID_CREDENTIALS',
    });
    await expect(
      setup(null, true).service.login({ identifier: 'a', password: 'x' }, 'ip'),
    ).rejects.toMatchObject({
      errorCode: 'INVALID_CREDENTIALS',
    });
  });

  it('terkunci setelah 5 gagal per akun+IP (FR-A6), IP lain tidak terpengaruh', async () => {
    const { service, redis } = setup(user, false);
    for (let i = 0; i < 5; i++) {
      await expect(
        service.login({ identifier: 'a', password: 'x' }, 'ip1'),
      ).rejects.toMatchObject({
        errorCode: 'INVALID_CREDENTIALS',
      });
    }
    await expect(
      service.login({ identifier: 'a', password: 'x' }, 'ip1'),
    ).rejects.toMatchObject({
      errorCode: 'LOGIN_LOCKED',
    });
    await expect(
      service.login({ identifier: 'a', password: 'x' }, 'ip2'),
    ).rejects.toMatchObject({
      errorCode: 'INVALID_CREDENTIALS',
    });
    expect(redis.store.get('login:fail:a:ip1')).toBe(5);
  });

  it('login sukses mereset hitungan gagal', async () => {
    const { service, redis } = setup(user, true);
    redis.store.set('login:fail:admin@x.id:ip', 3);
    await service.login({ identifier: 'admin@x.id', password: 'x' }, 'ip');
    expect(redis.store.has('login:fail:admin@x.id:ip')).toBe(false);
  });
});
