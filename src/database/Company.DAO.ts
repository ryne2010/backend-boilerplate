// Modules
import { Document } from 'mongodb';
import { ObjectId } from 'bson';
import { parseISO } from 'date-fns';

// Data Access
import MongoCollectionDAO from './MongoCollection.DAO';
import { Users } from './User.DAO';

// Models / Interfaces
import { IQueryResults } from '../interfaces';

// Utils
import { ApplicationError } from '../errors';
import { logger } from '../utils';

// ****************************************************************
class CompaniesDAO extends MongoCollectionDAO {
  constructor(databaseName: string) {
    super(databaseName, 'companies');
  }

  public async getUserSpendByCompany(
    companyId: string,
    periodStartDate = new Date(0).toISOString(),
    periodEndDate = new Date().toISOString()
  ): Promise<IQueryResults> {
    try {
      const startDate = parseISO(periodStartDate);
      const endDate = parseISO(periodEndDate);

      // Select all users for company
      const companyUsers: Document[] = await Users.collection
        .aggregate([
          {
            $match: {
              company: new ObjectId(companyId),
              status: { $nin: ['Pending Activation', 'Blocked', 'Deleted'] },
            },
          },
          { $project: { _id: 1, firstName: 1, lastName: 1 } },
          { $sort: { lastName: 1 } },
        ])
        .toArray();

      // Select all budgets for company
      const companyBudgetNames: string[] = await this.collection
        .aggregate([
          {
            $match: {
              company: new ObjectId(companyId),
              active: true,
            },
          },
          { $project: { name: 1 } },
          { $sort: { _id: 1 } },
        ])
        .toArray()
        .then((agg) => agg.map((b) => b.name));

      // Iterate users and aggregate spend data by budget.
      const results: Record<string, string | number>[] = await Promise.all(
        companyUsers.map(async (user) => {
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
            const userData: Record<string, string | number> = {
              user: `${user?.firstName} ${user?.lastName}`,
            };

            companyBudgetNames.forEach((budget: string) => {
              if (userSpendByBudget.length > 0) {
                const docToWrite = userSpendByBudget.find(
                  (doc) => doc.budgetName === budget
                );

                if (docToWrite) {
                  userData[budget] = parseInt(docToWrite.spend, 10) || 0;
                } else if (userBudgets.includes(budget)) {
                  userData[budget] = 0;
                } else {
                  userData[budget] = '';
                }
              } else {
                userData[budget] = '';
              }
            });

            return userData;
          } catch (error) {
            logger.error('Cannot perform aggregation');
            throw new ApplicationError(error as string);
          }
        })
      );

      // Return results
      return { budgets: companyBudgetNames, results };
    } catch (error) {
      console.error(error);
      throw new ApplicationError(error as string);
    }
  }
}

export const Companies = new CompaniesDAO('vendrix');
