// Modules
import { Document } from 'mongodb';
import { ObjectId } from 'bson';
import Decimal from 'decimal.js';
import { getUnixTime, parseISO, formatISO } from 'date-fns';

// Data Access
import MongoCollectionDAO from './MongoCollection.DAO';
import { CardTransactions } from './CardTransaction.DAO';

// Models / Interfaces
import { IBudgetGroup, ICardTransaction, IQueryResults } from '../interfaces';

// Utils
// import { ApplicationError } from '../errors';
// import { logger } from '../utils';

// ****************************************************************
class BudgetGroupsDAO extends MongoCollectionDAO {
  constructor(databaseName: string) {
    super(databaseName, 'budgetgroups');
  }

  // Returns the total complete and approved amounts for transactions in a budget group
  /** PROD  */
  public async getTotalSpendByBudget(
    budgetGroupId: string,
    updateDate = new Date(0)
  ): Promise<{
    totalApproved: Decimal;
    totalComplete: Decimal;
    totalAuthorized: Decimal;
    totalPeriodComplete: Decimal;
  }> {
    const totals2Parse = await CardTransactions.collection.aggregate([
      {
        $match: {
          budgetGroup: new ObjectId(budgetGroupId),
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
    let totalApproved = new Decimal('0');
    let totalComplete = new Decimal('0');
    let totalAuthorized = new Decimal('0');
    let totalPeriodComplete = new Decimal('0');
    const time = updateDate.getTime();

    totals2Parse.forEach((tran: Document | ICardTransaction) => {
      if (tran.state === 'COMPLETE' || tran.state === 'CREDIT') {
        if (tran.decimalPostedAmount) {
          totalComplete = totalComplete.plus(
            tran.decimalPostedAmount.toString()
          );
          if (tran.transactionPostedAt.getTime() > time) {
            totalPeriodComplete = totalPeriodComplete.plus(
              tran.decimalPostedAmount.toString()
            );
          }
        } else {
          throw new Error(
            'Transaction is marked "COMPLETE" or "CREDIT", but a valid amount is not present.'
          );
        }
      } else if (tran.state === 'PENDING-SWIPE') {
        if (tran.amount) {
          totalApproved = totalApproved.plus(tran.amount);
        } else {
          throw new Error(
            'Transaction is marked "PENDING-SWIPE", but a valid amount is not present.'
          );
        }
      } else if (tran.state === 'AUTHORIZED') {
        if (tran.decimalPreAuthAmount) {
          totalAuthorized = totalAuthorized.plus(
            tran.decimalPreAuthAmount.toString()
          );
        } else {
          throw new Error(
            'Transaction is marked "AUTHORIZED", but a valid amount is not present.'
          );
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
  public async getCumulativeSpendByBudget(
    budgetGroupId: string,
    periodStartDate = new Date(0).toISOString(),
    periodEndDate = new Date().toISOString()
  ): Promise<IQueryResults> {
    const startDate = parseISO(periodStartDate);
    const endDate = parseISO(periodEndDate);

    const budgetGroup = (await this.getById(budgetGroupId)) as IBudgetGroup;
    const { createdAt, amount } = budgetGroup;

    // aggregate transactions within budget
    const processedData: Document[] = await CardTransactions.collection
      .aggregate([
        // Aggregate documents within period from params
        {
          $match: {
            budgetGroup: new ObjectId(budgetGroupId),
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
          unixTime: getUnixTime(parseISO(`${doc._id}T08:00:00`)),
          budgetAllowance: parseInt(amount, 10),
        });
      });

      // Append data point/s
      results.unshift({
        _id: formatISO(createdAt, {
          representation: 'date',
        }),
        count: 0,
        dailyTotal: 0,
        cumulativeTotal: 0,
        unixTime: getUnixTime(createdAt),
        budgetAllowance: parseInt(amount, 10),
      });

      // Return array of data points
      return { results };
    } else {
      return { results: null };
    }
  }
}

export const BudgetGroups = new BudgetGroupsDAO('vendrix');
