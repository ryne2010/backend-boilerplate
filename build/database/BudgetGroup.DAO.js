"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetGroups = void 0;
const bson_1 = require("bson");
const decimal_js_1 = __importDefault(require("decimal.js"));
const date_fns_1 = require("date-fns");
// Data Access
const MongoCollection_DAO_1 = __importDefault(require("./MongoCollection.DAO"));
const CardTransaction_DAO_1 = require("./CardTransaction.DAO");
// Utils
// import { ApplicationError } from '../errors';
// import { logger } from '../utils';
// ****************************************************************
class BudgetGroupsDAO extends MongoCollection_DAO_1.default {
    constructor(databaseName) {
        super(databaseName, 'budgetgroups');
    }
    // Returns the total complete and approved amounts for transactions in a budget group
    /** PROD  */
    async getTotalSpendByBudget(budgetGroupId, updateDate = new Date(0)) {
        const totals2Parse = await CardTransaction_DAO_1.CardTransactions.collection.aggregate([
            {
                $match: {
                    budgetGroup: new bson_1.ObjectId(budgetGroupId),
                    $or: [
                        {
                            state: 'PENDING-SWIPE',
                        },
                        {
                            state: 'COMPLETE',
                        },
                        { state: 'AUTHORIZED' },
                        { state: 'CREDIT' },
                    ],
                },
            },
            {
                $project: {
                    amount: 1,
                    state: 1,
                    decimalPostedAmount: 1,
                    decimalPreAuthAmount: 1,
                    transactionPostedAt: 1,
                },
            },
        ]);
        let totalApproved = new decimal_js_1.default('0');
        let totalComplete = new decimal_js_1.default('0');
        let totalAuthorized = new decimal_js_1.default('0');
        let totalPeriodComplete = new decimal_js_1.default('0');
        const time = updateDate.getTime();
        totals2Parse.forEach((tran) => {
            if (tran.state === 'COMPLETE' || tran.state === 'CREDIT') {
                if (tran.decimalPostedAmount) {
                    totalComplete = totalComplete.plus(tran.decimalPostedAmount.toString());
                    if (tran.transactionPostedAt.getTime() > time) {
                        totalPeriodComplete = totalPeriodComplete.plus(tran.decimalPostedAmount.toString());
                    }
                }
                else {
                    throw new Error('Transaction is marked "COMPLETE" or "CREDIT", but a valid amount is not present.');
                }
            }
            else if (tran.state === 'PENDING-SWIPE') {
                if (tran.amount) {
                    totalApproved = totalApproved.plus(tran.amount);
                }
                else {
                    throw new Error('Transaction is marked "PENDING-SWIPE", but a valid amount is not present.');
                }
            }
            else if (tran.state === 'AUTHORIZED') {
                if (tran.decimalPreAuthAmount) {
                    totalAuthorized = totalAuthorized.plus(tran.decimalPreAuthAmount.toString());
                }
                else {
                    throw new Error('Transaction is marked "AUTHORIZED", but a valid amount is not present.');
                }
            }
        });
        return {
            totalApproved,
            totalComplete,
            totalAuthorized,
            totalPeriodComplete,
        };
    }
    /**
     * PROD
     *
     * @summary Returns the total complete and approved amounts for transactions in a budget group
     *
     * @param budgetGroupId
     * @param periodStartDate
     * @param periodEndDate
     * @return {Promise<IQueryResults>}
     */
    async getCumulativeSpendByBudget(budgetGroupId, periodStartDate = new Date(0).toISOString(), periodEndDate = new Date().toISOString()) {
        const startDate = (0, date_fns_1.parseISO)(periodStartDate);
        const endDate = (0, date_fns_1.parseISO)(periodEndDate);
        const budgetGroup = (await this.getById(budgetGroupId));
        const { createdAt, amount } = budgetGroup;
        // aggregate transactions within budget
        const processedData = await CardTransaction_DAO_1.CardTransactions.collection
            .aggregate([
            // Aggregate documents within period from params
            {
                $match: {
                    budgetGroup: new bson_1.ObjectId(budgetGroupId),
                    displayDate: {
                        $gte: startDate,
                        $lt: endDate,
                    }, // ! REVISED FOR TESTING. REMOVE WHEN IN PRODUCTION
                    // * COMMENTED OUT FOR TESTING PUT BACK IN FOR PRODUCTION
                    // $or: [
                    //   {
                    //     state: 'COMPLETE',
                    //   },
                    //   { state: 'CREDIT' },
                    // ],
                },
            },
            // ! REVISED FOR TESTING. REMOVE WHEN IN PRODUCTION
            // group transactions by day
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$displayDate',
                            timezone: 'America/Chicago',
                        },
                    },
                    count: { $sum: 1 },
                    // dailyTotal: { $sum: '$decimalPostedAmount' }, // ! Production
                    dailyTotal: { $sum: '$decimalAmount' }, // ! Testing
                },
            },
            // because docs are in ascending order by date, iterate transactions and append cumulative amount to doc by using global cumulativeTotal variable
            { $sort: { _id: 1 } },
        ])
            .toArray();
        let cumulativeTotal = 0;
        // * COMMENTED OUT FOR TESTING. PUT BACK IN FOR PRODUCTION
        // const results = processedData.map((doc) => {
        //   cumulativeTotal += parseInt(doc.dailyTotal, 10);
        //   return Object.assign(doc, {
        //   cumulativeTotal,
        //   dailyTotal: parseInt(doc.dailyTotal, 10),
        //   unixTime: getUnixTime(parseISO(doc._id)),
        // });
        // });
        // ! REVISED FOR TESTING. REMOVE WHEN IN PRODUCTION
        if (processedData.length > 0) {
            const results = processedData.map((doc) => {
                cumulativeTotal += parseInt(doc.dailyTotal, 10);
                return Object.assign(doc, {
                    cumulativeTotal,
                    dailyTotal: parseInt(doc.dailyTotal, 10),
                    unixTime: (0, date_fns_1.getUnixTime)((0, date_fns_1.parseISO)(`${doc._id}T08:00:00`)),
                    budgetAllowance: parseInt(amount, 10),
                });
            });
            // Append data point/s
            results.unshift({
                _id: (0, date_fns_1.formatISO)(createdAt, {
                    representation: 'date',
                }),
                count: 0,
                dailyTotal: 0,
                cumulativeTotal: 0,
                unixTime: (0, date_fns_1.getUnixTime)(createdAt),
                budgetAllowance: parseInt(amount, 10),
            });
            // Return array of data points
            return { results };
        }
        else {
            return { results: null };
        }
    }
}
exports.BudgetGroups = new BudgetGroupsDAO('vendrix');
//# sourceMappingURL=BudgetGroup.DAO.js.map