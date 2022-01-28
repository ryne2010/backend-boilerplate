"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationError = void 0;
class ApplicationError extends Error {
    message = 'ApplicationError';
    status = 500;
    logMessage = '';
    logToGcp = false;
    constructor(message, status, logToGcp = false, logMessage = '') {
        super(message);
        if (message != null) {
            this.message = message;
        }
        if (status != null) {
            this.status = status;
        }
        this.logMessage = logMessage;
        this.logToGcp = logToGcp;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApplicationError = ApplicationError;
//# sourceMappingURL=application-error.js.map