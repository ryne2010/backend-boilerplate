"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardTransactions = void 0;
const bson_1 = require("bson");
const decimal_js_1 = __importDefault(require("decimal.js"));
// Data Access
const MongoCollection_DAO_1 = __importDefault(require("./MongoCollection.DAO"));
// Plugins
const misc_Plugin_1 = require("../plugins/misc.Plugin");
const CardTransaction_Plugin_1 = require("../plugins/CardTransaction.Plugin");
const BudgetGroup_Plugin_1 = require("../plugins/BudgetGroup.Plugin");
// Utils
const errors_1 = require("../errors");
const utils_1 = require("../utils");
// ****************************************************************
class CardTransactionsDAO extends MongoCollection_DAO_1.default {
    constructor(databaseName) {
        super(databaseName, 'cardtransactions');
    }
    // This query looks for similar merchants in the transaction
    // Because of th way the query works multiple merchant locations (i.e. Starbucks)
    // could have different merchant id's so we want to also return results with the
    // same merchant name
    async findSimilarCardTransactions(merchant, card) {
        try {
            const filter = {
                $or: [{ merchant: merchant._id }, { merchantName: merchant.name }],
                card: card._id,
            };
            const options = { limit: 1, sort: { _id: -1 } };
            return this.collection
                .find(filter, options)
                .toArray();
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to get similar transactions', 500, true, error);
        }
    }
    async updateTransactionDetails(id, updateParams) {
        try {
            // Set the MCC History state object, 0 means MCC is closed, 1 MCC is open
            const filter = { _id: new bson_1.ObjectId(id) };
            const update = {
                $set: {
                    ...updateParams,
                },
            };
            return this.collection.updateOne(filter, update);
        }
        catch (error) {
            throw new errors_1.ApplicationError(`Unable to update transaction ${id}`, 500, true, error);
        }
    }
    async addFlexTransactionDetails(id, updateParams) {
        try {
            // Set the MCC History state object, 0 means MCC is closed, 1 MCC is open
            const filter = { _id: new bson_1.ObjectId(id) };
            const update = {
                $addToSet: {
                    ...updateParams,
                },
            };
            return this.collection.updateOne(filter, update);
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to add flex transaction details to transaction', 500, true, error);
        }
    }
    async findOneAndUpdate(id, merchant, metaData = {}, fuel = false) {
        try {
            let mcc;
            let mccArray;
            fuel ? (mcc = 5542) : (mcc = merchant.mcc);
            fuel ? (mccArray = [5542]) : (mccArray = merchant.mccArray);
            // Set the MCC History state object, 0 means MCC is closed, 1 MCC is open
            // eslint-disable-next-line prefer-const
            let mccState = {};
            mccArray.forEach((mcc1) => {
                mccState[mcc1] = 1;
            });
            const filter = { _id: new bson_1.ObjectId(id) };
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
                    merchant: new bson_1.ObjectId(merchant._id),
                    location: merchant.location,
                    updatedAt: new Date(),
                },
            };
            return this.collection.updateOne(filter, update);
        }
        catch (error) {
            throw new errors_1.ApplicationError(`Unable to update transaction: ${id}`, 500, true, error);
        }
    }
    async updateMCC(event, transaction) {
        try {
            // eslint-disable-next-line prefer-const
            let mccState = {};
            transaction.mccArray.forEach((mcc) => (mccState[mcc.toString()] = new bson_1.Int32(0)));
            mccState[event.mccNumber] = new bson_1.Int32(1);
            const _id = new bson_1.ObjectId(transaction._id);
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
                .then((updatedDocument) => {
                if (updatedDocument) {
                    utils_1.logger.debug('Successfully Updated Card Transactions for new MCC');
                }
                else {
                    utils_1.logger.error('No document matches the provided query.');
                }
                transaction.mcc = new bson_1.Int32(event.mccNumber);
                transaction.mccState = mccState;
                transaction.mccArray = [new bson_1.Int32(event.mccNumber)];
            });
            return transaction;
        }
        catch (error) {
            throw new errors_1.ApplicationError('Update MCC failed on cardTransactions DAO', 500, true, error);
        }
    }
    async getTransactions(event, cardObject) {
        const card = new bson_1.ObjectId(cardObject._id);
        try {
            // This will search for an idMatchNumber First
            // This happens if swapped at a fuel pump
            const preAuthAmount128 = bson_1.Decimal128.fromString(event.preAuthAmount.toString());
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
            }
            else if (parseInt(event.mccGroup) === 30001) {
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
            }
            else if (parseInt(event.mccGroup) === 30007) {
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
            }
            else {
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
            return transactions;
        }
        catch (error) {
            throw new errors_1.ApplicationError('Failed to get transactions', 500, true, error);
        }
    }
    async getPostedTransactions(event, cardObject) {
        const card = new bson_1.ObjectId(cardObject._id);
        const date = new Date();
        const amount = Math.abs(parseFloat(event.postedAmount.toString()));
        const amount128 = bson_1.Decimal128.fromString(amount.toString());
        // Only return transactions up the 3 months old
        try {
            const query = {
                card,
                decimalPostedAmount: { $gte: amount128 },
                transactionPostedAt: {
                    $gte: new Date(date.getFullYear(), date.getMonth() - 3, date.getDate()),
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
                    .toArray());
            }
            return transactions;
        }
        catch (error) {
            throw new errors_1.ApplicationError('Failed to get posted Transactions', 500, true, error);
        }
    }
    async processReversalEvent(event, matchedRecord, options = { save: true }) {
        const _id = new bson_1.ObjectId(matchedRecord._id);
        if (!matchedRecord.preAuthAmount)
            throw new errors_1.ApplicationError('Pre-Auth Amount is missing on matched record');
        const preAuthAmount = new decimal_js_1.default(matchedRecord.preAuthAmount).minus(event.preAuthAmount.toString());
        const decimalPreAuthAmount = bson_1.Decimal128.fromString(preAuthAmount.toString());
        try {
            let update = {};
            const mccArray = Object.keys(matchedRecord.mccState).map((mcc) => new bson_1.Int32(mcc));
            // eslint-disable-next-line prefer-const
            let mccState = {};
            mccArray.map((mcc) => (mccState[mcc.toString()] = new bson_1.Int32(1)));
            if (new decimal_js_1.default(event.preAuthAmount.toString()).eq(matchedRecord.preAuthAmount)) {
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
            }
            else {
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
                return this.collection.updateOne({ _id }, update);
            }
            return [{ _id }, update];
        }
        catch (error) {
            throw new errors_1.ApplicationError('Failed to process reversal event', 500, true, error);
        }
    }
    async processPreAuthEvent(event, matchedRecord, options = { save: true }, reGen = false) {
        const _id = new bson_1.ObjectId(matchedRecord._id);
        const fuel = event.mccNumber === '5542' ? true : false;
        const isCardCheck = (0, CardTransaction_Plugin_1.checkIfCardCheck)(event);
        try {
            let update = {};
            // Set the MCC History state object, 0 means MCC is closed, 1 MCC is open
            // eslint-disable-next-line prefer-const
            let mccState = {};
            matchedRecord.mccArray.map((mcc) => (mccState[mcc.toString()] = new bson_1.Int32(0)));
            if (isCardCheck) {
                update = {
                    $set: {
                        cardCheckAt: new Date(event.transactionTimeStampUTC),
                        mcc: new bson_1.Int32(event.mccNumber),
                        mccState,
                        mccArray: [new bson_1.Int32(event.mccNumber)],
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
            }
            else {
                update = {
                    $set: {
                        preAuthAmount: event.preAuthAmount.toString(),
                        mcc: new bson_1.Int32(event.mccNumber),
                        reGen,
                        mccState,
                        mccArray: [new bson_1.Int32(event.mccNumber)],
                        updatedAt: new Date(),
                        displayDate: new Date(),
                        decimalPreAuthAmount: bson_1.Decimal128.fromString(event.preAuthAmount.toString()),
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
                matchedRecord['mcc'] = new bson_1.Int32(event.mccNumber);
                matchedRecord['mccArray'] = [new bson_1.Int32(event.mccNumber)];
                matchedRecord['reGen'] = reGen;
                matchedRecord['mccState'] = { ...mccState };
            }
            if (options.save) {
                return this.collection.updateOne({ _id }, update);
            }
            return [{ _id }, update];
        }
        catch (error) {
            throw new errors_1.ApplicationError('Failed to process preAuth Event', 500, true, error);
        }
    }
    async createCreditTransaction(event, matchedRecord, budgetGroup, options = { save: true }) {
        const _id = new bson_1.ObjectId();
        try {
            const update = {
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
                    mcc: new bson_1.Int32(event.mccNumber),
                    merchant: matchedRecord.merchant,
                    merchantName: event.merchantCity === 'EASYSAVINGS'
                        ? `[VENDRIX REWARDS] ${(0, misc_Plugin_1.toTitleCase)(event.acceptLocation)}`
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
                    decimalAmount: bson_1.Decimal128.fromString(event.postedAmount.toString()),
                    requiredActions: (0, BudgetGroup_Plugin_1.checkReqBudgetFields)(budgetGroup),
                    decimalPostedAmount: bson_1.Decimal128.fromString(event.postedAmount.toString()),
                    decimalPreAuthAmount: bson_1.Decimal128.fromString(event.preAuthAmount.toString()),
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
                return this.collection.insertOne(update);
            }
            return [{ _id }, update];
        }
        catch (error) {
            throw new errors_1.ApplicationError('Failed to created new credit transaction', 500, true, error);
        }
    }
    async findByIdMatchNumber(event, cardObject) {
        try {
            return this.collection.findOne({
                card: new bson_1.ObjectId(cardObject._id),
                idMatchNumber: event.idMatchNumber,
                state: { $ne: 'COMPLETE' },
            });
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to find transaction by Id Match Number', 500, true, error);
        }
    }
    async getPending(cardId) {
        try {
            const cardTransactionsDoc = {
                card: new bson_1.ObjectId(cardId),
                state: 'PENDING-SWIPE',
            };
            return this.collection
                .find(cardTransactionsDoc)
                .toArray();
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to get Pending Swipe Transactions', 500, true, error);
        }
    }
    async matchDeclinedTransaction(event, cardObject) {
        const card = new bson_1.ObjectId(cardObject._id);
        const preAuthAmount128 = bson_1.Decimal128.fromString(event.preAuthAmount.toString());
        const query = {
            card,
            decimalAmount: { $gte: preAuthAmount128 },
            state: 'PENDING-SWIPE',
            flexPay: { $ne: true },
        };
        return this.collection
            .find(query)
            .toArray();
    }
    async completeTransaction(event, transaction, options = { save: true }) {
        try {
            const query = { _id: transaction._id };
            const { postedAmount, decimalPostedAmount } = (0, CardTransaction_Plugin_1.checkPostedPreAuth)(event, transaction);
            const update = {
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
            transaction['postedAmount'] = postedAmount;
            transaction['decimalPostedAmount'] = decimalPostedAmount;
            transaction['userStatus'] = 'Complete';
            transaction['state'] = 'COMPLETE';
            transaction['transactionPostedAt'] = new Date(event.transactionTimeStampUTC);
            if (options.save) {
                return this.collection
                    .updateOne(query, update)
                    .then((updatedDocument) => {
                    if (updatedDocument) {
                        utils_1.logger.debug(`Successfully updated Card Transactions.`);
                    }
                    else {
                        utils_1.logger.error('No document matches the provided query.');
                    }
                    return transaction;
                });
            }
            return [query, update];
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to get matched decline transactions', 500, true, error);
        }
    }
    async deleteAllTransactionsByUser(docArray) {
        try {
            const filter = {
                user: { $in: docArray },
            };
            return this.collection
                .deleteMany(filter)
                .then((updatedDocument) => {
                if (updatedDocument) {
                    utils_1.logger.debug('Successfully Deleted Transactions');
                }
                else {
                    utils_1.logger.error('No document matches the provided query.');
                }
            });
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to Delete all user Transactions', 500, true, error);
        }
    }
    async deleteAllTransactionsByBudget(docArray) {
        try {
            const docIds = docArray.map((doc) => doc._id);
            const filter = {
                budgetGroup: { $in: docIds },
            };
            return this.collection
                .deleteMany(filter)
                .then((updatedDocument) => {
                if (updatedDocument) {
                    utils_1.logger.debug('Successfully Deleted Transactions');
                }
                else {
                    utils_1.logger.error('No document matches the provided query.');
                }
            });
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to Delete all user Transactions', 500, true, error);
        }
    }
}
exports.CardTransactions = new CardTransactionsDAO('vendrix');
//# sourceMappingURL=CardTransaction.DAO.js.map