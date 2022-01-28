import { NextFunction, Request, Response } from 'express';
import jwt from 'express-jwt';
import jwks from 'jwks-rsa';

// Check to Ensure GCP Token is Valid
export const gcpJwtCheck = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip checking for JWT token for testing
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  const jtwCheck = jwt({
    secret: jwks.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri: process.env.JWT_GCP_PUBLIC_KEY as string,
    }),
    audience: process.env.JWT_GCP_AUDIENCE,
    issuer: process.env.JWT_GCP_ISSUER,
    requestProperty: 'serviceAccountUser',
    algorithms: ['RS256'],
  });
  return jtwCheck(req, res, next);
};

// OLD
export const apiGateWayJwtParse = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip checking for JWT token for testing
  if (process.env.NODE_ENV === 'testing') {
    next();
  }
  if (req.headers['x-apigateway-api-userinfo']) {
    req.user = JSON.parse(
      Buffer.from(
        req.headers['x-apigateway-api-userinfo'] as string,
        'base64'
      ).toString()
    );
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
