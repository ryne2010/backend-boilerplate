"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Error Handling
const application_error_1 = require("@errors/application-error");
const Company_Routes_1 = __importDefault(require("@routes/Company.Routes"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const morgan_1 = __importDefault(require("morgan"));
const app = (0, express_1.default)();
// All Request behind a Load Balancer and CF
app.set('trust proxy', true);
// Logger
// app.use(logResponseTime);
// Dev Logging Middleware
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
// Body Parser
app.use(express_1.default.json());
// Set security headers
app.use((0, helmet_1.default)());
// Prevent http param pollution
app.use((0, hpp_1.default)());
//app.use(gcpJwtCheck, apiGateWayJwtParse);
// General API Routes
app.use('/api/v2/companies', Company_Routes_1.default);
app.use('/api/v2/test', (req, res) => {
    console.log(req.headers);
    res.status(200);
    return res.json({ success: true, data: 'I am Here' });
});
// Testing
app.use('/api/v2/localtest', (req, res) => {
    // console.log(JSON.stringify(req.headers));
    res.status(200);
    return res.json({ success: true, data: 'I am Here' });
});
// Return 404 for all other routes
app.use((req, res, next) => {
    res.status(404);
    res.json({ success: false, data: 'Not Found' });
    next();
});
// ****** Error Handling ****** //
// TO DO FIX Application Error and Import
app.use((err, _req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    // This is not working for what ever reason
    if (err instanceof application_error_1.ApplicationError) {
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
});
exports.default = app;
//# sourceMappingURL=app.js.map