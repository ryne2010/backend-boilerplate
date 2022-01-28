"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesController = void 0;
// Data Access
const database_1 = require("../database");
// Utils
const utils_1 = require("../utils");
// ***********************************************************************************************
class CompaniesController {
    static async test(_req, res, next) {
        try {
            return res
                .status(201)
                .json({ success: true, data: 'Successfully hit test endpoint' });
        }
        catch (error) {
            utils_1.logger.error(error);
            return next(error);
        }
    }
    static async getCompany(req, res) {
        const { companyId } = req.params;
        try {
            const data = {
                results: [(await database_1.Companies.getById(companyId))],
            };
            if (!data)
                return res.status(404).json({
                    success: false,
                    data: null,
                    message: 'Company Not Found',
                    details: {},
                });
            return res.status(200).json({ success: true, data });
        }
        catch (error) {
            utils_1.logger.error(error);
            return res.status(500).json({
                success: false,
                data: null,
                details: error,
                message: 'Error retrieving company',
            });
        }
    }
    static async getUserSpendByCompany(req, res) {
        const { companyId } = req.params;
        // ** Define Variables ** //
        const queryParams = JSON.parse(req.query.query_params);
        // ** Execute query and return ** //
        utils_1.logger.debug('Calling "BudgetGroups.userSpendByCompany" service with params: %o', queryParams);
        try {
            const data = await database_1.Companies.getUserSpendByCompany(queryParams?.companyId ?? companyId, queryParams.periodStartDate, queryParams.periodEndDate);
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
        }
        catch (error) {
            utils_1.logger.error(error);
            return res.status(500).json({
                success: false,
                data: null,
                details: error,
                message: 'Error retrieving budget group data',
            });
        }
    }
}
exports.CompaniesController = CompaniesController;
//# sourceMappingURL=Company.Controller.js.map