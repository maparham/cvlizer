/**
 * Centralized Logger Utility
 *
 * This module provides environment-aware logging with:
 * - Log levels: debug, info, warn, error
 * - Environment filtering (dev vs production)
 * - Throttling for warn/error in production
 * - Context metadata support
 * - Replaces all console.* calls throughout the app
 *
 * Usage:
 * ```typescript
 * Logger.debug('CV data loaded', { cvId, sections });
 * Logger.info('User action completed', { action: 'save' });
 * Logger.warn('Deprecated feature used', { feature: 'old-api' });
 * Logger.error('API call failed', { endpoint, error });
 * ```
 */

/**
 * Log levels in ascending order of severity
 */
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

/**
 * Context metadata for logs
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Throttle configuration for production logging
 */
interface ThrottleConfig {
  maxLogsPerMinute: number;
  lastResetTime: number;
  currentCount: number;
}

/**
 * Logger class with environment-aware logging
 */
class LoggerClass {
  private isDevelopment: boolean;
  private minLevel: LogLevel;
  private throttle: ThrottleConfig;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || false;
    this.minLevel = this.isDevelopment ? LogLevel.Debug : LogLevel.Warn;
    this.throttle = {
      maxLogsPerMinute: 10,
      lastResetTime: Date.now(),
      currentCount: 0,
    };
  }

  /**
   * Check if we should throttle logging in production
   */
  private shouldThrottle(): boolean {
    if (this.isDevelopment) {
      return false; // Never throttle in development
    }

    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Reset counter every minute
    if (now - this.throttle.lastResetTime > oneMinute) {
      this.throttle.lastResetTime = now;
      this.throttle.currentCount = 0;
      return false;
    }

    // Check if we've exceeded the limit
    if (this.throttle.currentCount >= this.throttle.maxLogsPerMinute) {
      return true;
    }

    this.throttle.currentCount++;
    return false;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level].toUpperCase();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    if (this.isDevelopment) {
      return `[${timestamp}] [${levelName}] ${message}${contextStr}`;
    }

    // Shorter format for production
    return `[${levelName}] ${message}${contextStr}`;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    // Always allow error and warn in production (with throttling)
    if (level >= LogLevel.Warn && !this.shouldThrottle()) {
      return true;
    }

    // In development, log everything >= minLevel
    return this.isDevelopment && level >= this.minLevel;
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.Debug)) {
      console.log(this.formatMessage(LogLevel.Debug, message, context));
    }
  }

  /**
   * Log info message (development only)
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.info(this.formatMessage(LogLevel.Info, message, context));
    }
  }

  /**
   * Log warning message (development and production with throttling)
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.Warn)) {
      console.warn(this.formatMessage(LogLevel.Warn, message, context));
    }
  }

  /**
   * Log error message (development and production with throttling)
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.Error)) {
      console.error(this.formatMessage(LogLevel.Error, message, context));
    }
  }

  /**
   * Log error with Error object
   */
  errorWithException(message: string, error: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.Error)) {
      const errorContext = {
        ...context,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: this.isDevelopment ? error.stack : undefined,
      };
      console.error(this.formatMessage(LogLevel.Error, message, errorContext));
    }
  }

  /**
   * Group logs (development only)
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  /**
   * End log group (development only)
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Log table (development only, useful for arrays/objects)
   */
  table(data: unknown): void {
    if (this.isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Performance timing start
   */
  timeStart(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * Performance timing end
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Set minimum log level (for testing purposes)
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * Singleton logger instance
 */
export const Logger = new LoggerClass();

/**
 * Export for testing
 */
export { LoggerClass };
