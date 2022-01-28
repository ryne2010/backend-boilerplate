export class ApplicationError extends Error {
  public message = 'ApplicationError';
  public status = 500;
  public logMessage = '';
  public logToGcp = false;

  constructor(message: string, status?: number, logToGcp = false, logMessage = '') {
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
