"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Users = exports.UsersDAO = void 0;
// Modules
const bson_1 = require("bson");
const errors_1 = require("../errors");
// Data Access
const MongoCollection_DAO_1 = __importDefault(require("./MongoCollection.DAO"));
// Utils
// import { logger } from '../utils';
// *******************************************************************************
class UsersDAO extends MongoCollection_DAO_1.default {
    constructor(databaseName) {
        super(databaseName, 'users');
    }
    // Very important this is only to be used during the inital enrollment proccess,
    // All uther should be the update command below
    async addUserAbDetails(userId, autoBudgetArray) {
        try {
            // This function will add all the autobudgets to the user
            // "autobudgets" array. this should only be used on card enrollment
            const filter = { _id: new bson_1.ObjectId(userId) };
            const update = {
                $addToSet: { autoBudget: { $each: autoBudgetArray } },
            };
            const options = {};
            return (await this.collection.updateOne(filter, update, options));
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to get user by ID', 500, true, error);
        }
    }
    // This update the user details on the budget change only,
    async updateUserAbBalance(userId, autoBudget) {
        try {
            // This function will add all the autobudgets to the user
            // "autobudgets" array. this should only be used on card enrollment
            const filter = { _id: new bson_1.ObjectId(userId) };
            const update = {
                $set: { autoBudget },
            };
            const options = {};
            return this.collection.updateOne(filter, update, options);
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to get user by ID', 500, true, error);
        }
    }
    async deleteUserAb(id, autoBudget) {
        try {
            // This function deletes a single autobudget from the User Profile autoBudgets array
            const filter = { _id: new bson_1.ObjectId(id) };
            const update = {
                $pull: {
                    autoBudget: { autoBudgetName: autoBudget.autoBudgetName },
                },
            };
            const options = {};
            return this.collection.updateOne(filter, update, options);
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to get user by ID', 500, true, error);
        }
    }
}
exports.UsersDAO = UsersDAO;
exports.Users = new UsersDAO('vendrix');
//# sourceMappingURL=User.DAO.js.map