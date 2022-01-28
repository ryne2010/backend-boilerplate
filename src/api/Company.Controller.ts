// Modules
import { NextFunction, Request, Response } from 'express';
// Data Access
import { Companies } from '../database';
// Models / Interfaces
import { ICompany, IQueryParams, IQueryResults } from '../interfaces';
// Utils
import { logger } from '../utils';

// ***********************************************************************************************
export class CompaniesController {
  public static async test(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      return res
        .status(201)
        .json({ success: true, data: 'Successfully hit test endpoint' });
    } catch (error) {
      logger.error(error);
      return next(error);
    }
  }

  public static async getCompany(
    req: Request,
    res: Response
  ): Promise<Response | void> {
    const { companyId } = req.params;

    try {
      const data: IQueryResults = {
        results: [(await Companies.getById(companyId)) as unknown as ICompany],
      };
      if (!data)
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Company Not Found',
          details: {},
        });
      return res.status(200).json({ success: true, data });
    } catch (error) {
      logger.error(error);
      return res.status(500).json({
        success: false,
        data: null,
        details: error,
        message: 'Error retrieving company',
      });
    }
  }

  public static async getUserSpendByCompany(
    req: Request,
    res: Response
  ): Promise<Response | void> {
    const { companyId } = req.params;

    // ** Define Variables ** //
    const queryParams = JSON.parse(
      req.query.query_params as string
    ) as IQueryParams;

    // ** Execute query and return ** //
    logger.debug(
      'Calling "BudgetGroups.userSpendByCompany" service with params: %o',
      queryParams
    );

    try {
      const data = await Companies.getUserSpendByCompany(
        queryParams?.companyId ?? companyId,
        queryParams.periodStartDate,
        queryParams.periodEndDate
      );
      if (!data)
        return res.status(404).json({
          success: false,
          data: null,
          details: {},
          message: 'No data returned',
        });

      return res.status(200).json({
        success: true,
        data,
        details: { count: data.results?.length },
      });
    } catch (error) {
      logger.error(error);
      return res.status(500).json({
        success: false,
        data: null,
        details: error,
        message: 'Error retrieving budget group data',
      });
    }
  }
}
