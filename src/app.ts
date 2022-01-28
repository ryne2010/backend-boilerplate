// Error Handling
import { ApplicationError } from '@errors/application-error';
import CompanyRouter from '@routes/Company.Routes';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

const app = express();
// All Request behind a Load Balancer and CF
app.set('trust proxy', true);
// Logger
// app.use(logResponseTime);
// Dev Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Body Parser
app.use(express.json());
// Set security headers
app.use(helmet());
// Prevent http param pollution
app.use(hpp());

//app.use(gcpJwtCheck, apiGateWayJwtParse);

// General API Routes
app.use('/api/v2/companies', CompanyRouter);

app.use('/api/v2/test', (req: Request, res: Response) => {
  console.log(req.headers);
  res.status(200);
  return res.json({ success: true, data: 'I am Here' });
});
// Testing
app.use('/api/v2/localtest', (req: Request, res: Response) => {
  // console.log(JSON.stringify(req.headers));
  res.status(200);
  return res.json({ success: true, data: 'I am Here' });
});

// Return 404 for all other routes
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404);
  res.json({ success: false, data: 'Not Found' });
  next();
});

// ****** Error Handling ****** //
// TO DO FIX Application Error and Import
app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    next: NextFunction
  ): Response | void => {
    if (res.headersSent) {
      return next(err);
    }
    // This is not working for what ever reason
    if (err instanceof ApplicationError) {
      console.error(err);
      return res.status(err.status || 500).json({
        message: 'Internal Server Error',
        error: err.message,
      });
    }
    return res.status(500).json({
      message: 'Internal Server Error',
      error: 'Internal Error',
    });
  }
);

export default app;
