import { RateLimitStore } from './rate-limit.store';

describe('RateLimitStore', () => {
  it('allows up to the limit and then blocks within the window', () => {
    const store = new RateLimitStore();
    const results = Array.from({ length: 4 }, () => store.hit('ip:1', 3, 60_000, 1_000));

    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results[0]?.remaining).toBe(2);
    expect(results[3]?.remaining).toBe(0);
    expect(results[3]?.retryAfterSeconds).toBe(60);
  });

  it('resets once the window has elapsed', () => {
    const store = new RateLimitStore();
    store.hit('ip:1', 1, 1_000, 0);

    expect(store.hit('ip:1', 1, 1_000, 500).allowed).toBe(false);
    expect(store.hit('ip:1', 1, 1_000, 1_001).allowed).toBe(true);
  });

  it('counts each key independently', () => {
    const store = new RateLimitStore();
    store.hit('ip:1', 1, 60_000, 0);

    expect(store.hit('ip:2', 1, 60_000, 0).allowed).toBe(true);
  });
});
