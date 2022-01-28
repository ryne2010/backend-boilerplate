"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
/* eslint-disable  */
const winston_1 = require("winston");
const winston_transport_1 = __importDefault(require("winston-transport"));
const logging_winston_1 = require("@google-cloud/logging-winston");
const chalk_1 = __importDefault(require("chalk"));
// ******************************** DEFINITIONS ***********************************
const getTimeStampString = () => new Date(Date.now()).toISOString();
const STYLES = {
    ERROR: chalk_1.default.bold.red,
    WARN: chalk_1.default.keyword('orange'),
    INFO: chalk_1.default.hex('#c4c64f'),
    VERBOSE: chalk_1.default.hex('#6435c9'),
    DEBUG: chalk_1.default.hex('#2185d0'),
    SILLY: chalk_1.default.hex('#f011ce'),
};
var LABELS;
(function (LABELS) {
    LABELS["ERROR"] = "ERROR";
    LABELS["WARN"] = "WARN";
    LABELS["INFO"] = "INFO";
    LABELS["VERBOSE"] = "VERBOSE";
    LABELS["DEBUG"] = "DEBUG";
    LABELS["SILLY"] = "SILLY";
})(LABELS || (LABELS = {}));
class ConsoleLogger {
    log = (style, label, ...messages) => {
        const finalMessage = `[${getTimeStampString()}] [${label}]`;
        console.log(style(finalMessage, ...messages.map((item) => {
            if (item.stack) {
                return '\n' + item.stack;
            }
            else if (item.message) {
                return item.message;
            }
            return item;
        })));
    };
    error = (...messages) => this.log(STYLES.ERROR, LABELS.ERROR, ...messages);
    warn = (...messages) => this.log(STYLES.WARN, LABELS.WARN, ...messages);
    info = (...messages) => this.log(STYLES.INFO, LABELS.INFO, ...messages);
    verbose = (...messages) => this.log(STYLES.VERBOSE, LABELS.VERBOSE, ...messages);
    debug = (...messages) => this.log(STYLES.DEBUG, LABELS.DEBUG, ...messages);
    silly = (...messages) => this.log(STYLES.SILLY, LABELS.SILLY, ...messages);
}
const levelStyleMap = {
    error: STYLES.ERROR,
    warn: STYLES.WARN,
    info: STYLES.INFO,
    verbose: STYLES.VERBOSE,
    debug: STYLES.DEBUG,
    silly: STYLES.SILLY,
};
class ConsoleLoggerTransport extends winston_transport_1.default {
    logger = new ConsoleLogger();
    log(info, callback) {
        const style = levelStyleMap[info.level] || STYLES.DEBUG;
        const label = info.consoleLoggerOptions?.label || info.level.toUpperCase();
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
const cloudLogger = new logging_winston_1.LoggingWinston({
    logName: process.env.GCP_CLOUD_LOG_NAME,
});
// *** LOCAL CONSOLE LOGGING ***
const localLogger = new ConsoleLoggerTransport();
// *** LOCAL LOG FILE WRITING ***
const localFileWriter = new winston_1.transports.File({
    level: 'error',
    filename: './logs/error.log',
    format: winston_1.format.json({
        replacer: (key, value) => {
            if (key === 'error') {
                return {
                    message: value.message,
                    stack: value.stack,
                };
            }
            return value;
        },
    }),
});
// ******************************** EXPORTS ***********************************
exports.logger = (0, winston_1.createLogger)({
    format: winston_1.format.combine(winston_1.format.timestamp()),
    level: process.env.NODE_ENV === 'development' ? 'silly' : 'info',
    transports: [localFileWriter, localLogger, cloudLogger],
    defaultMeta: { service: 'api' },
});
//# sourceMappingURL=logger.js.map