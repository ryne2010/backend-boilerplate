// Modules
import {
  Document,
  FindOptions,
  Filter,
  UpdateFilter,
  UpdateResult,
  DeleteResult,
} from 'mongodb';
import { ObjectId, Decimal128, Int32 } from 'bson';
import Decimal from 'decimal.js';

// Data Access
import MongoCollectionDAO from './MongoCollection.DAO';

// Models / Interfaces
import {
  IBudgetGroup,
  ICardTransaction,
  IComdataCardEvent,
  ICardObject,
} from '../interfaces';

// Plugins
import { toTitleCase } from '../plugins/misc.Plugin';
import {
  checkPostedPreAuth,
  checkIfCardCheck,
} from '../plugins/CardTransaction.Plugin';
import { checkReqBudgetFields } from '../plugins/BudgetGroup.Plugin';

// Utils
import { ApplicationError } from '../errors';
import { logger } from '../utils';

// ****************************************************************
class CardTransactionsDAO extends MongoCollectionDAO {
  constructor(databaseName: string) {
    super(databaseName, 'cardtransactions');
  }

  // This query looks for similar merchants in the transaction
  // Because of th way the query works multiple merchant locations (i.e. Starbucks)
  // could have different merchant id's so we want to also return results with the
  // same merchant name
  async findSimilarCardTransactions(
    merchant: { _id: ObjectId; name: string },
    card: { _id: ObjectId }
  ): Promise<ICardTransaction[] | null> {
    try {
      const filter: Filter<Document> = {
        $or: [{ merchant: merchant._id }, { merchantName: merchant.name }],
        card: card._id,
      };
      const options: FindOptions = { limit: 1, sort: { _id: -1 } };

      return this.collection
        .find(filter, options)
        .toArray() as unknown as ICardTransaction[];
    } catch (error) {
      throw new ApplicationError(
        'Unable to get similar transactions',
        500,
        true,
        error as string
      );
    }
  }

  async updateTransactionDetails(
    id: string,
    updateParams: any
  ): Promise<ICardTransaction> {
    try {
      // Set the MCC History state object, 0 means MCC is closed, 1 MCC is open

      const filter: Filter<Document> = { _id: new ObjectId(id) };
      const update: UpdateFilter<Document> = {
        $set: {
          ...updateParams,
        },
      };
      return this.collection.updateOne(
        filter,
        update
      ) as unknown as ICardTransaction;
    } catch (error) {
      throw new ApplicationError(
        `Unable to update transaction ${id}`,
        500,
        true,
        error as string
      );
    }
  }

  async addFlexTransactionDetails(
    id: string,
    updateParams: any
  ): Promise<ICardTransaction> {
    try {
      // Set the MCC History state object, 0 means MCC is closed, 1 MCC is open
      const filter: Filter<Document> = { _id: new ObjectId(id) };
      const update: UpdateFilter<Document> = {
        $addToSet: {
          ...updateParams,
        },
      };
      return this.collection.updateOne(
        filter,
        update
      ) as unknown as ICardTransaction;
    } catch (error) {
      throw new ApplicationError(
        'Unable to add flex transaction details to transaction',
        500,
        true,
        error as string
      );
    }
  }

  async findOneAndUpdate(
    id: string,
    merchant: {
      mcc: any;
      mccArray: any;
      mccGroup: any;
      name: any;
      location: { formattedAddress: any };
      _id: string;
    },
    metaData: Record<string, unknown> = {},
    fuel = false
  ): Promise<ICardTransaction> {
    try {
      let mcc;
      let mccArray;
      fuel ? (mcc = 5542) : (mcc = merchant.mcc);
      fuel ? (mccArray = [5542]) : (mccArray = merchant.mccArray);

      // Set the MCC History state object, 0 means MCC is closed, 1 MCC is open
      // eslint-disable-next-line prefer-const
      let mccState: Record<string, number> = {};
      mccArray.forEach((mcc1: string | number) => {
        mccState[mcc1] = 1;
      });

      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          mcc,
          mccGroup: merchant.mccGroup,
          mccArray,
          merchantName: metaData.merchantName
            ? `${metaData.merchantName} ${merchant.name}`
            : merchant.name,
          mccState,
          address: merchant.location.formattedAddress,
          merchant: new ObjectId(merchant._id),
          location: merchant.location,
          updatedAt: new Date(),
        },
      };
      return this.collection.updateOne(
        filter,
        update
      ) as unknown as ICardTransaction;
    } catch (error) {
      throw new ApplicationError(
        `Unable to update transaction: ${id}`,
        500,
        true,
        error as string
      );
    }
  }

  async updateMCC(
    event: IComdataCardEvent,
    transaction: ICardTransaction
  ): Promise<ICardTransaction> {
    try {
      // eslint-disable-next-line prefer-const
      let mccState: Record<string, Int32> = {};
      transaction.mccArray.forEach(
        (mcc) => (mccState[mcc.toString()] = new Int32(0))
      );
      mccState[event.mccNumber] = new Int32(1);

      const _id = new ObjectId(transaction._id);
      const filter = { _id };
      const update = {
        $set: {
          mcc: event.mccNumber,
          mccGroup: event.mccGroup,
          mccState,
          declineMatchScore: transaction.matchScore,
          updatedAt: new Date(),
        },
        $push: {
          mccHistory: transaction.mcc,
          mccUpdateHistoryEvent: event,
          event,
          cardEventIds: event._id,
        },
        $addToSet: {
          mccArray: event.mccNumber,
        },
      };
      await this.collection
        .updateOne(filter, update)
        .then((updatedDocument: Document) => {
          if (updatedDocument) {
            logger.debug('Successfully Updated Card Transactions for new MCC');
          } else {
            logger.error('No document matches the provided query.');
          }
          transaction.mcc = new Int32(event.mccNumber);
          transaction.mccState = mccState;
          transaction.mccArray = [new Int32(event.mccNumber)];
        });
      return transaction as ICardTransaction;
    } catch (error) {
      throw new ApplicationError(
        'Update MCC failed on cardTransactions DAO',
        500,
        true,
        error as string
      );
    }
  }

  async getTransactions(
    event: IComdataCardEvent,
    cardObject: ICardObject
  ): Promise<ICardTransaction[]> {
    const card = new ObjectId(cardObject._id);
    try {
      // This will search for an idMatchNumber First
      // This happens if swapped at a fuel pump
      const preAuthAmount128 = Decimal128.fromString(
        event.preAuthAmount.toString()
      );
      let query;
      if (event.reversalFlag === 'Y') {
        // A reversal is a return from a pre-auth, prior to the transaction posting
        // Webhooks return an int SOAP a string so look for both
        query = {
          card,
          'event.approvalCode': {
            $in: [event.approvalCode, event.approvalCode],
          },
        };
      } else if (parseInt(event.mccGroup) === 30001) {
        query = {
          card,
          $or: [
            {
              idMatchNumber: event.idMatchNumber,
              state: { $ne: 'COMPLETE' },
            },
            {
              $and: [
                { decimalAmount: { $gte: preAuthAmount128 } },
                { state: 'PENDING-SWIPE' },
                {
                  mcc: { $in: [763, 4468, 5499, 5541, 5542, 5983, 9752, 1] },
                },
              ],
            },
          ],
        };
      } else if (parseInt(event.mccGroup) === 30007) {
        query = {
          card,
          $or: [
            { idMatchNumber: event.idMatchNumber, state: { $ne: 'COMPLETE' } },
            {
              $and: [
                { decimalAmount: { $gte: preAuthAmount128 } },
                { state: 'PENDING-SWIPE' },
                {
                  mcc: { $in: [5811, 5812, 5813, 5814] },
                },
              ],
            },
          ],
        };
      } else {
        // If transaction is 1 pre-auth is is generally a card check
        query = {
          card,
          $or: [
            {
              idMatchNumber: event.idMatchNumber,
              state: { $ne: 'COMPLETE' },
            },
            {
              $and: [
                { mccArray: { $in: [event.mccNumber] } },
                { decimalAmount: { $gte: preAuthAmount128 } },
                { state: 'PENDING-SWIPE' },
              ],
            },
          ],
        };
      }
      const transactions = await this.collection.find(query).toArray();
      // Check for double pre-auth on single transaction
      return transactions as ICardTransaction[];
    } catch (error) {
      throw new ApplicationError(
        'Failed to get transactions',
        500,
        true,
        error as string
      );
    }
  }

  async getPostedTransactions(
    event: IComdataCardEvent,
    cardObject: { _id: string }
  ): Promise<ICardTransaction[]> {
    const card = new ObjectId(cardObject._id);
    const date = new Date();
    const amount = Math.abs(parseFloat(event.postedAmount.toString()));
    const amount128 = Decimal128.fromString(amount.toString());
    // Only return transactions up the 3 months old
    try {
      const query = {
        card,
        decimalPostedAmount: { $gte: amount128 },
        transactionPostedAt: {
          $gte: new Date(
            date.getFullYear(),
            date.getMonth() - 3,
            date.getDate()
          ),
        },
        state: 'COMPLETE',
        $or: [
          { 'event.merchantAddress': event.merchantAddress },
          { 'event.merchantName': event.merchantName },
          { mcc: event.mccNumber },
        ],
      };
      let transactions = await this.collection.find(query).toArray();
      // Perform Atlas Search if no records found for similar merchant
      if (transactions.length === 0) {
        const agg = [
          {
            $search: {
              index: 'cardTransactions',
              text: {
                query: event.merchantName,
                path: 'merchantName',
              },
            },
          },
          {
            $match: {
              card,
              state: 'COMPLETE',
            },
          },
          {
            $limit: 1,
          },
        ];
        transactions = (await this.collection
          .aggregate(agg)
          .toArray()) as ICardTransaction[];
      }

      return transactions as ICardTransaction[];
    } catch (error) {
      throw new ApplicationError(
        'Failed to get posted Transactions',
        500,
        true,
        error as string
      );
    }
  }

  async processReversalEvent(
    event: IComdataCardEvent,
    matchedRecord: ICardTransaction,
    options = { save: true }
  ): Promise<
    ICardTransaction | [{ _id: ObjectId }, UpdateFilter<ICardTransaction>]
  > {
    const _id = new ObjectId(matchedRecord._id);
    if (!matchedRecord.preAuthAmount)
      throw new ApplicationError(
        'Pre-Auth Amount is missing on matched record'
      );
    const preAuthAmount = new Decimal(matchedRecord.preAuthAmount).minus(
      event.preAuthAmount.toString()
    );
    const decimalPreAuthAmount = Decimal128.fromString(
      preAuthAmount.toString()
    );
    try {
      let update = {};
      const mccArray = Object.keys(matchedRecord.mccState).map(
        (mcc) => new Int32(mcc)
      );

      // eslint-disable-next-line prefer-const
      let mccState: Record<string, Int32> = {};
      mccArray.map((mcc) => (mccState[mcc.toString()] = new Int32(1)));
      if (
        new Decimal(event.preAuthAmount.toString()).eq(
          matchedRecord.preAuthAmount
        )
      ) {
        update = {
          $set: {
            state: 'PENDING-SWIPE',
            userStatus: 'Approved',
            mccArray,
            mccState,
            reversalAt: new Date(),
            updatedAt: new Date(),
          },
          $unset: {
            decimalPreAuthAmount: '',
            preAuthAmount: '',
            transactionSwipedAt: '',
            reGen: '',
            replicaTransaction: '',
          },
          $push: { event, cardEventIds: event._id },
        };
        matchedRecord['state'] = 'PENDING-SWIPE';
        matchedRecord['userStatus'] = 'Approved';
        matchedRecord['reversalAt'] = new Date();
        matchedRecord['mccArray'] = mccArray;
        matchedRecord['mccState'] = mccState;
        // delete matchedRecord['decimalPreAuthAmount'];
        // delete matchedRecord['preAuthAmount'];
        // delete matchedRecord['transactionSwipedAt'];
      } else {
        update = {
          $set: {
            reversalAt: new Date(),
            preAuthAmount,
            decimalPreAuthAmount,
            updatedAt: new Date(),
          },
          $push: { event, cardEventIds: event._id },
        };
        matchedRecord['preAuthAmount'] = preAuthAmount.toString();
        matchedRecord['decimalPreAuthAmount'] = decimalPreAuthAmount;
        matchedRecord['reversalAt'] = new Date();
      }
      if (options.save) {
        return this.collection.updateOne(
          { _id },
          update
        ) as unknown as ICardTransaction;
      }
      return [{ _id }, update];
    } catch (error) {
      throw new ApplicationError(
        'Failed to process reversal event',
        500,
        true,
        error as string
      );
    }
  }

  async processPreAuthEvent(
    event: IComdataCardEvent,
    matchedRecord: ICardTransaction,
    options = { save: true },
    reGen = false
  ): Promise<
    ICardTransaction | [{ _id: ObjectId }, UpdateFilter<ICardTransaction>]
  > {
    const _id = new ObjectId(matchedRecord._id);
    const fuel = event.mccNumber === '5542' ? true : false;
    const isCardCheck = checkIfCardCheck(event);

    try {
      let update: UpdateFilter<ICardTransaction> = {};
      // Set the MCC History state object, 0 means MCC is closed, 1 MCC is open
      // eslint-disable-next-line prefer-const
      let mccState: Record<string, Int32> = {};
      matchedRecord.mccArray.map(
        (mcc) => (mccState[mcc.toString()] = new Int32(0))
      );
      if (isCardCheck) {
        update = {
          $set: {
            cardCheckAt: new Date(event.transactionTimeStampUTC),
            mcc: new Int32(event.mccNumber),
            mccState,
            mccArray: [new Int32(event.mccNumber)],
            fuel,
            cardCheck: true,
            displayDate: new Date(),
            updatedAt: new Date(),
            cardCheckMatchScore: matchedRecord.matchScore,
          },
          $push: {
            event: event,
            idMatchNumber: event.idMatchNumber,
            cardEventIds: event._id.toString(),
          },
        };
      } else {
        update = {
          $set: {
            preAuthAmount: event.preAuthAmount.toString(),
            mcc: new Int32(event.mccNumber),
            reGen,
            mccState,
            mccArray: [new Int32(event.mccNumber)],
            updatedAt: new Date(),
            displayDate: new Date(),
            decimalPreAuthAmount: Decimal128.fromString(
              event.preAuthAmount.toString()
            ),
            matchScore: matchedRecord.matchScore,
            userStatus: 'Charge Pending',
            state: 'AUTHORIZED',
            transactionSwipedAt: new Date(event.transactionTimeStampUTC),
          },
          $push: {
            event,
            idMatchNumber: event.idMatchNumber,
            cardEventIds: event._id.toString(),
          },
        };
        matchedRecord['preAuthAmount'] = event.preAuthAmount.toString();
        matchedRecord['userStatus'] = 'Charge Pending';
        matchedRecord['state'] = 'AUTHORIZED';
        matchedRecord['mcc'] = new Int32(event.mccNumber);
        matchedRecord['mccArray'] = [new Int32(event.mccNumber)];
        matchedRecord['reGen'] = reGen;
        matchedRecord['mccState'] = { ...mccState };
      }
      if (options.save) {
        return this.collection.updateOne(
          { _id },
          update
        ) as unknown as ICardTransaction;
      }
      return [{ _id }, update];
    } catch (error) {
      throw new ApplicationError(
        'Failed to process preAuth Event',
        500,
        true,
        error as string
      );
    }
  }

  async createCreditTransaction(
    event: IComdataCardEvent,
    matchedRecord: ICardTransaction,
    budgetGroup: IBudgetGroup,
    options = { save: true }
  ): Promise<
    ICardTransaction | [{ _id: ObjectId }, UpdateFilter<ICardTransaction>]
  > {
    const _id = new ObjectId();

    try {
      const update: UpdateFilter<ICardTransaction> = {
        $set: {
          _id,
          location: matchedRecord.location,
          transactionType: 'Credit',
          delegatedPurchase: false,
          verifiedMerchant: true,
          state: 'COMPLETE',
          network: 'MASTERCARD',
          amount: event.postedAmount.toString(),
          preAuthAmount: event.preAuthAmount.toString(),
          postedAmount: event.postedAmount.toString(),
          displayDate: new Date(),
          approverName: matchedRecord.approverName,
          address: matchedRecord.address,
          tagA: matchedRecord.tagA ? matchedRecord.tagA : undefined,
          tagB: matchedRecord.tagB ? matchedRecord.tagB : undefined,
          tagC: matchedRecord.tagC ? matchedRecord.tagC : undefined,
          approver: matchedRecord.approver,
          card: matchedRecord.card,
          description: matchedRecord.description,
          mcc: new Int32(event.mccNumber),
          merchant: matchedRecord.merchant,
          merchantName:
            event.merchantCity === 'EASYSAVINGS'
              ? `[VENDRIX REWARDS] ${toTitleCase(event.acceptLocation)}`
              : matchedRecord.merchantName,
          user: matchedRecord.user,
          budgetGroupName: matchedRecord.budgetGroupName,
          userAvatarLink: matchedRecord.userAvatarLink,
          userFirstName: matchedRecord.userFirstName,
          userLastName: matchedRecord.userLastName,
          approverAvatarLink: matchedRecord.approverAvatarLink,
          company: matchedRecord.company,
          budgetGroup: matchedRecord.budgetGroup,
          userTransaction: matchedRecord.userTransaction,
          userStatus: 'Credit',
          decimalAmount: Decimal128.fromString(event.postedAmount.toString()),
          requiredActions: checkReqBudgetFields(budgetGroup),
          decimalPostedAmount: Decimal128.fromString(
            event.postedAmount.toString()
          ),
          decimalPreAuthAmount: Decimal128.fromString(
            event.preAuthAmount.toString()
          ),
          creditAt: new Date(),
          transactionPostedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        $push: {
          event,
          idMatchNumber: event.idMatchNumber,
          cardEventIds: event._id.toString(),
        },
      };

      if (options.save) {
        return this.collection.insertOne(update) as unknown as ICardTransaction;
      }
      return [{ _id }, update];
    } catch (error) {
      throw new ApplicationError(
        'Failed to created new credit transaction',
        500,
        true,
        error as string
      );
    }
  }

  async findByIdMatchNumber(
    event: IComdataCardEvent,
    cardObject: ICardObject
  ): Promise<ICardTransaction | null> {
    try {
      return this.collection.findOne({
        card: new ObjectId(cardObject._id),
        idMatchNumber: event.idMatchNumber,
        state: { $ne: 'COMPLETE' },
      }) as unknown as ICardTransaction;
    } catch (error) {
      throw new ApplicationError(
        'Unable to find transaction by Id Match Number',
        500,
        true,
        error as string
      );
    }
  }

  async getPending(cardId: string): Promise<ICardTransaction[]> {
    try {
      const cardTransactionsDoc = {
        card: new ObjectId(cardId),
        state: 'PENDING-SWIPE',
      };

      return this.collection
        .find(cardTransactionsDoc)
        .toArray() as unknown as ICardTransaction[];
    } catch (error) {
      throw new ApplicationError(
        'Unable to get Pending Swipe Transactions',
        500,
        true,
        error as string
      );
    }
  }

  async matchDeclinedTransaction(
    event: IComdataCardEvent,
    cardObject: ICardObject
  ): Promise<ICardTransaction[] | undefined> {
    const card = new ObjectId(cardObject._id);
    const preAuthAmount128 = Decimal128.fromString(
      event.preAuthAmount.toString()
    );
    const query = {
      card,
      decimalAmount: { $gte: preAuthAmount128 },
      state: 'PENDING-SWIPE',
      flexPay: { $ne: true },
    };
    return this.collection
      .find(query)
      .toArray() as unknown as ICardTransaction[];
  }

  async completeTransaction(
    event: IComdataCardEvent,
    transaction: ICardTransaction,
    options = { save: true }
  ): Promise<
    | ICardTransaction
    | [Filter<ICardTransaction>, UpdateFilter<ICardTransaction>]
  > {
    try {
      const query = { _id: transaction._id };
      const { postedAmount, decimalPostedAmount } = checkPostedPreAuth(
        event,
        transaction
      );
      const update: UpdateFilter<ICardTransaction> = {
        $set: {
          postedAmount,
          decimalPostedAmount,
          [`mccState.${event.mccNumber}`]: 0,
          userStatus: 'Complete',
          state: 'COMPLETE',
          updatedAt: new Date(),
          displayDate: new Date(),
          transactionPostedAt: new Date(event.transactionTimeStampUTC),
        },
        $push: { event, cardEventIds: event._id.toString() },
      };
      transaction['postedAmount'] = postedAmount as string;
      transaction['decimalPostedAmount'] = decimalPostedAmount as Decimal128;
      transaction['userStatus'] = 'Complete';
      transaction['state'] = 'COMPLETE';
      transaction['transactionPostedAt'] = new Date(
        event.transactionTimeStampUTC
      );

      if (options.save) {
        return this.collection
          .updateOne(query, update)
          .then((updatedDocument: UpdateResult) => {
            if (updatedDocument) {
              logger.debug(`Successfully updated Card Transactions.`);
            } else {
              logger.error('No document matches the provided query.');
            }
            return transaction as ICardTransaction;
          });
      }
      return [query, update];
    } catch (error) {
      throw new ApplicationError(
        'Unable to get matched decline transactions',
        500,
        true,
        error as string
      );
    }
  }

  async deleteAllTransactionsByUser(docArray: ICardTransaction[]) {
    try {
      const filter = {
        user: { $in: docArray },
      };

      return this.collection
        .deleteMany(filter)
        .then((updatedDocument: DeleteResult) => {
          if (updatedDocument) {
            logger.debug('Successfully Deleted Transactions');
          } else {
            logger.error('No document matches the provided query.');
          }
        });
    } catch (error) {
      throw new ApplicationError(
        'Unable to Delete all user Transactions',
        500,
        true,
        error as string
      );
    }
  }

  async deleteAllTransactionsByBudget(docArray: ICardTransaction[]) {
    try {
      const docIds = docArray.map((doc) => doc._id);
      const filter = {
        budgetGroup: { $in: docIds },
      };

      return this.collection
        .deleteMany(filter)
        .then((updatedDocument: DeleteResult) => {
          if (updatedDocument) {
            logger.debug('Successfully Deleted Transactions');
          } else {
            logger.error('No document matches the provided query.');
          }
        });
    } catch (error) {
      throw new ApplicationError(
        'Unable to Delete all user Transactions',
        500,
        true,
        error as string
      );
    }
  }
}

export const CardTransactions = new CardTransactionsDAO('vendrix');
