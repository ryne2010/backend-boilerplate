"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Companies = void 0;
const bson_1 = require("bson");
const date_fns_1 = require("date-fns");
// Data Access
const MongoCollection_DAO_1 = __importDefault(require("./MongoCollection.DAO"));
const User_DAO_1 = require("./User.DAO");
// Utils
const errors_1 = require("../errors");
const utils_1 = require("../utils");
// ****************************************************************
class CompaniesDAO extends MongoCollection_DAO_1.default {
    constructor(databaseName) {
        super(databaseName, 'companies');
    }
    async getUserSpendByCompany(companyId, periodStartDate = new Date(0).toISOString(), periodEndDate = new Date().toISOString()) {
        try {
            const startDate = (0, date_fns_1.parseISO)(periodStartDate);
            const endDate = (0, date_fns_1.parseISO)(periodEndDate);
            // Select all users for company
            const companyUsers = await User_DAO_1.Users.collection
                .aggregate([
                {
                    $match: {
                        company: new bson_1.ObjectId(companyId),
                        status: { $nin: ['Pending Activation', 'Blocked', 'Deleted'] },
                    },
                },
                { $project: { _id: 1, firstName: 1, lastName: 1 } },
                { $sort: { lastName: 1 } },
            ])
                .toArray();
            // Select all budgets for company
            const companyBudgetNames = await this.collection
                .aggregate([
                {
                    $match: {
                        company: new bson_1.ObjectId(companyId),
                        active: true,
                    },
                },
                { $project: { name: 1 } },
                { $sort: { _id: 1 } },
            ])
                .toArray()
                .then((agg) => agg.map((b) => b.name));
            // Iterate users and aggregate spend data by budget.
            const results = await Promise.all(companyUsers.map(async (user) => {
                try {
                    // Get user budgets
                    const userBudgets = await this.collection
                        .aggregate([
                        {
                            $match: {
                                $or: [
                                    {
                                        'budgetOwner._id': user._id,
                                    },
                                    {
                                        'approvers._id': user._id,
                                    },
                                    { 'members._id': user._id },
                                ],
                            },
                        },
                        {
                            $project: { name: 1 },
                        },
                    ])
                        .toArray()
                        .then((agg) => agg.map((b) => b.name));
                    // Aggregate total user spend by budget
                    const userSpendByBudget = await this.collection
                        .aggregate([
                        {
                            $match: {
                                user: user._id,
                                displayDate: {
                                    $gte: startDate,
                                    $lt: endDate,
                                },
                            },
                        },
                        {
                            $group: {
                                _id: '$budgetGroup',
                                budgetName: {
                                    $first: '$budgetGroupName',
                                },
                                user: {
                                    $first: {
                                        $concat: ['$userFirstName', ' ', '$userLastName'],
                                    },
                                },
                                count: { $sum: 1 },
                                // budgetSpend: { $sum: '$decimalPostedAmount' }, // ! PRODUCTION
                                spend: { $sum: '$decimalAmount' }, // ! TESTING
                            },
                        },
                        { $sort: { budgetName: 1 } },
                    ])
                        .toArray();
                    // Process data
                    const userData = {
                        user: `${user?.firstName} ${user?.lastName}`,
                    };
                    companyBudgetNames.forEach((budget) => {
                        if (userSpendByBudget.length > 0) {
                            const docToWrite = userSpendByBudget.find((doc) => doc.budgetName === budget);
                            if (docToWrite) {
                                userData[budget] = parseInt(docToWrite.spend, 10) || 0;
                            }
                            else if (userBudgets.includes(budget)) {
                                userData[budget] = 0;
                            }
                            else {
                                userData[budget] = '';
                            }
                        }
                        else {
                            userData[budget] = '';
                        }
                    });
                    return userData;
                }
                catch (error) {
                    utils_1.logger.error('Cannot perform aggregation');
                    throw new errors_1.ApplicationError(error);
                }
            }));
            // Return results
            return { budgets: companyBudgetNames, results };
        }
        catch (error) {
            console.error(error);
            throw new errors_1.ApplicationError(error);
        }
    }
}
exports.Companies = new CompaniesDAO('vendrix');
//# sourceMappingURL=Company.DAO.js.map