import winston from 'winston';
import { env, isDevelopment } from './environment.js';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Create Winston logger
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }

      if (stack) {
        log += `\n${stack}`;
      }

      return log;
    })
  ),
  defaultMeta: { service: 'angel-investing-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),

    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// If we're not in production, log to the console with colors
if (isDevelopment) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;

          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }

          if (stack) {
            log += `\n${stack}`;
          }

          return log;
        })
      ),
    })
  );
}

// Create HTTP request logger middleware format
export const httpLoggerFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.printf(({ timestamp, method, url, status, responseTime, ip }) => {
    return JSON.stringify({
      timestamp,
      method,
      url,
      status,
      responseTime: `${responseTime}ms`,
      ip,
    });
  })
);

// HTTP request logger for Morgan
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;