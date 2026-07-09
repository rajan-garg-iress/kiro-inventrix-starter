import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, redactPii } from './logger.js';

describe('redactPii', () => {
  it('redacts keys matching PII pattern', () => {
    const input = {
      email: 'test@example.com',
      password: 'secret123',
      name: 'John',
    };
    const result = redactPii(input) as Record<string, unknown>;
    expect(result.email).toBe('[REDACTED]');
    expect(result.password).toBe('[REDACTED]');
    expect(result.name).toBe('John');
  });

  it('redacts nested objects recursively', () => {
    const input = {
      user: {
        email: 'test@example.com',
        profile: {
          token: 'abc123',
          displayName: 'John',
        },
      },
    };
    const result = redactPii(input) as Record<string, unknown>;
    const user = result.user as Record<string, unknown>;
    expect(user.email).toBe('[REDACTED]');
    const profile = user.profile as Record<string, unknown>;
    expect(profile.token).toBe('[REDACTED]');
    expect(profile.displayName).toBe('John');
  });

  it('handles arrays', () => {
    const input = [
      { email: 'a@b.com', id: 1 },
      { email: 'c@d.com', id: 2 },
    ];
    const result = redactPii(input) as Array<Record<string, unknown>>;
    expect(result[0].email).toBe('[REDACTED]');
    expect(result[0].id).toBe(1);
    expect(result[1].email).toBe('[REDACTED]');
    expect(result[1].id).toBe(2);
  });

  it('handles null and undefined', () => {
    expect(redactPii(null)).toBe(null);
    expect(redactPii(undefined)).toBe(undefined);
  });

  it('handles primitives', () => {
    expect(redactPii('hello')).toBe('hello');
    expect(redactPii(42)).toBe(42);
    expect(redactPii(true)).toBe(true);
  });

  it('redacts case-insensitively', () => {
    const input = {
      Authorization: 'Bearer xyz',
      SECRET_KEY: 'mysecret',
      userToken: 'tok123',
    };
    const result = redactPii(input) as Record<string, unknown>;
    expect(result.Authorization).toBe('[REDACTED]');
    expect(result.SECRET_KEY).toBe('[REDACTED]');
    expect(result.userToken).toBe('[REDACTED]');
  });
});

describe('createLogger', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let writeSpy: any;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as any);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('outputs valid JSON with required fields for each log level', () => {
    const logger = createLogger();
    const levels = ['info', 'warn', 'error', 'debug'] as const;

    for (const level of levels) {
      writeSpy.mockClear();
      logger[level]('test message');

      expect(writeSpy).toHaveBeenCalledTimes(1);
      const output = (writeSpy.mock.calls[0][0] as string).trim();
      const parsed = JSON.parse(output);

      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
      expect(parsed.level).toBe(level);
      expect(parsed.message).toBe('test message');
    }
  });

  it('includes context when provided', () => {
    const logger = createLogger();
    logger.info('with context', { userId: 123, action: 'login' });

    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);

    expect(parsed.context).toEqual({ userId: 123, action: 'login' });
  });

  it('does not include context field when not provided', () => {
    const logger = createLogger();
    logger.info('no context');

    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);

    expect(parsed.context).toBeUndefined();
  });

  it('redacts PII in context before output', () => {
    const logger = createLogger();
    logger.info('user action', {
      email: 'user@test.com',
      password: 'hunter2',
      action: 'login',
    });

    const output = (writeSpy.mock.calls[0][0] as string).trim();
    const parsed = JSON.parse(output);

    expect(parsed.context.email).toBe('[REDACTED]');
    expect(parsed.context.password).toBe('[REDACTED]');
    expect(parsed.context.action).toBe('login');
  });
});
