type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

const PII_PATTERN = /email|password|token|authorization|secret/i;

export function redactPii(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactPii(item));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (PII_PATTERN.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactPii(value);
      }
    }
    return result;
  }

  return obj;
}

function writeLog(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context !== undefined) {
    entry.context = redactPii(context) as Record<string, unknown>;
  }

  process.stdout.write(JSON.stringify(entry) + '\n');
}

export function createLogger(): Logger {
  return {
    info(message: string, context?: Record<string, unknown>): void {
      writeLog('info', message, context);
    },
    warn(message: string, context?: Record<string, unknown>): void {
      writeLog('warn', message, context);
    },
    error(message: string, context?: Record<string, unknown>): void {
      writeLog('error', message, context);
    },
    debug(message: string, context?: Record<string, unknown>): void {
      writeLog('debug', message, context);
    },
  };
}
