// Modules
import { ObjectId } from 'bson';
import { ApplicationError } from '../errors';
// Models / Interfaces
import { IAutoBudget, IUser } from '../interfaces';
// Data Access
import MongoCollectionDAO from './MongoCollection.DAO';

// Utils
// import { logger } from '../utils';

// *******************************************************************************
export class UsersDAO extends MongoCollectionDAO {
  constructor(databaseName: string) {
    super(databaseName, 'users');
  }

  // Very important this is only to be used during the inital enrollment proccess,
  // All uther should be the update command below
  async addUserAbDetails(
    userId: string,
    autoBudgetArray: IAutoBudget[]
  ): Promise<IUser> {
    try {
      // This function will add all the autobudgets to the user
      // "autobudgets" array. this should only be used on card enrollment
      const filter = { _id: new ObjectId(userId) };
      const update = {
        $addToSet: { autoBudget: { $each: autoBudgetArray } },
      };
      const options = {};
      return (await this.collection.updateOne(
        filter,
        update,
        options
      )) as unknown as IUser;
    } catch (error) {
      throw new ApplicationError(
        'Unable to get user by ID',
        500,
        true,
        error as string
      );
    }
  }
  // This update the user details on the budget change only,

  async updateUserAbBalance(
    userId: string,
    autoBudget: Record<string, unknown>
  ): Promise<IUser> {
    try {
      // This function will add all the autobudgets to the user
      // "autobudgets" array. this should only be used on card enrollment
      const filter = { _id: new ObjectId(userId) };
      const update = {
        $set: { autoBudget },
      };
      const options = {};
      return this.collection.updateOne(
        filter,
        update,
        options
      ) as unknown as IUser;
    } catch (error) {
      throw new ApplicationError(
        'Unable to get user by ID',
        500,
        true,
        error as string
      );
    }
  }

  async deleteUserAb(
    id: string,
    autoBudget: Record<string, unknown>
  ): Promise<IUser> {
    try {
      // This function deletes a single autobudget from the User Profile autoBudgets array
      const filter = { _id: new ObjectId(id) };
      const update = {
        $pull: {
          autoBudget: { autoBudgetName: autoBudget.autoBudgetName },
        },
      };
      const options = {};
      return this.collection.updateOne(
        filter,
        update,
        options
      ) as unknown as IUser;
    } catch (error) {
      throw new ApplicationError(
        'Unable to get user by ID',
        500,
        true,
        error as string
      );
    }
  }

  // async updatePrimaryCard(card: Record<string, unknown>): Promise<IUser> {
  //   try {
  //     const filter = {
  //       _id: card.user,
  //     };

  //     const update = {
  //       $set: {
  //         primaryPhysicalCard: [
  //           {
  //             _id: new ObjectId(),
  //             card: card._id,
  //             status: card.status,
  //             cardStatus: card.cardStatus,
  //             cardLastFour: card.cardLastFour,
  //           },
  //         ],
  //       },
  //     };
  //     return this.collection
  //       .updateOne(filter, update)
  //       .catch((e: void | Error) => {
  //         console.log(e);
  //       }) as unknown as IUser;
  //   } catch (error) {
  //     throw new ApplicationError(
  //       'Unable to get user by ID',
  //       500,
  //       true,
  //       error as string
  //     );
  //   }
  // }
}

export const Users = new UsersDAO('vendrix');
