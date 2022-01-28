"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiGateWayJwtParse = exports.gcpJwtCheck = void 0;
const express_jwt_1 = __importDefault(require("express-jwt"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
// Check to Ensure GCP Token is Valid
const gcpJwtCheck = (req, res, next) => {
    // Skip checking for JWT token for testing
    if (process.env.NODE_ENV === 'test') {
        return next();
    }
    const jtwCheck = (0, express_jwt_1.default)({
        secret: jwks_rsa_1.default.expressJwtSecret({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 10,
            jwksUri: process.env.JWT_GCP_PUBLIC_KEY,
        }),
        audience: process.env.JWT_GCP_AUDIENCE,
        issuer: process.env.JWT_GCP_ISSUER,
        requestProperty: 'serviceAccountUser',
        algorithms: ['RS256'],
    });
    return jtwCheck(req, res, next);
};
exports.gcpJwtCheck = gcpJwtCheck;
// OLD
const apiGateWayJwtParse = (req, res, next) => {
    // Skip checking for JWT token for testing
    if (process.env.NODE_ENV === 'testing') {
        next();
    }
    if (req.headers['x-apigateway-api-userinfo']) {
        req.user = JSON.parse(Buffer.from(req.headers['x-apigateway-api-userinfo'], 'base64').toString());
        // const userId = req.user[`${process.env.AUTH0_JWT_VENDRIXID}`];
        // const companyId = req.user[`${process.env.AUTH0_JWT_COMPANYID}`];
        // const email = req.user[process.env.AUTH0_JWT_USEREMAIL];
        // req.user = Object.assign(req.user, {
        //   userId,
        //   companyId,
        //   email,
        //   isVendrixAdmin: req.user.permissions.includes('scope:vendrixAdmin'),
        //   isCompanyAdmin: req.user.permissions.includes('scope:companyAdmin'),
        // });
        return next();
    }
    next();
};
exports.apiGateWayJwtParse = apiGateWayJwtParse;
//# sourceMappingURL=auth0.js.map