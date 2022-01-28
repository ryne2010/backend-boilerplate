/* eslint-disable  */
import { createLogger, format, transports } from 'winston';
import Transport from 'winston-transport';
import { LoggingWinston } from '@google-cloud/logging-winston';
import chalk from 'chalk';

// ******************************** DEFINITIONS ***********************************
const getTimeStampString = () => new Date(Date.now()).toISOString();

const STYLES = {
  ERROR: chalk.bold.red,
  WARN: chalk.keyword('orange'),
  INFO: chalk.hex('#c4c64f'),
  VERBOSE: chalk.hex('#6435c9'),
  DEBUG: chalk.hex('#2185d0'),
  SILLY: chalk.hex('#f011ce'),
};

enum LABELS {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  VERBOSE = 'VERBOSE',
  DEBUG = 'DEBUG',
  SILLY = 'SILLY',
}

class ConsoleLogger {
  public log = (
    style: chalk.Chalk,
    label: LABELS | string,
    ...messages: any[]
  ) => {
    const finalMessage = `[${getTimeStampString()}] [${label}]`;
    console.log(
      style(
        finalMessage,
        ...messages.map((item) => {
          if (item.stack) {
            return '\n' + item.stack;
          } else if (item.message) {
            return item.message;
          }
          return item;
        })
      )
    );
  };

  public error = (...messages: any[]) =>
    this.log(STYLES.ERROR, LABELS.ERROR, ...messages);

  public warn = (...messages: any[]) =>
    this.log(STYLES.WARN, LABELS.WARN, ...messages);

  public info = (...messages: any[]) =>
    this.log(STYLES.INFO, LABELS.INFO, ...messages);

  public verbose = (...messages: any[]) =>
    this.log(STYLES.VERBOSE, LABELS.VERBOSE, ...messages);

  public debug = (...messages: any[]) =>
    this.log(STYLES.DEBUG, LABELS.DEBUG, ...messages);

  public silly = (...messages: any[]) =>
    this.log(STYLES.SILLY, LABELS.SILLY, ...messages);
}

const levelStyleMap: { [key: string]: chalk.Chalk } = {
  error: STYLES.ERROR,
  warn: STYLES.WARN,
  info: STYLES.INFO,
  verbose: STYLES.VERBOSE,
  debug: STYLES.DEBUG,
  silly: STYLES.SILLY,
};

class ConsoleLoggerTransport extends Transport {
  private logger = new ConsoleLogger();

  log(info: any, callback: { (): void }) {
    const style = levelStyleMap[info.level as string] || STYLES.DEBUG;
    const label =
      info.consoleLoggerOptions?.label || (info.level as string).toUpperCase();
    const messages = [info.message];
    if (info.error) {
      messages.push(info.error);
    }
    this.logger.log(style, label, ...messages);
    callback();
  }
}
// *******************************************************************************

// *** GCP CLOUD LOGGING ***
const cloudLogger = new LoggingWinston({
  logName: process.env.GCP_CLOUD_LOG_NAME,
});

// *** LOCAL CONSOLE LOGGING ***
const localLogger = new ConsoleLoggerTransport();

// *** LOCAL LOG FILE WRITING ***
const localFileWriter = new transports.File({
  level: 'error',
  filename: './logs/error.log',
  format: format.json({
    replacer: (key, value) => {
      if (key === 'error') {
        return {
          message: (value as Error).message,
          stack: (value as Error).stack,
        };
      }
      return value;
    },
  }),
});

// ******************************** EXPORTS ***********************************
export const logger = createLogger({
  format: format.combine(format.timestamp()),
  level: process.env.NODE_ENV === 'development' ? 'silly' : 'info',
  transports: [localFileWriter, localLogger, cloudLogger],
  defaultMeta: { service: 'api' },
});
