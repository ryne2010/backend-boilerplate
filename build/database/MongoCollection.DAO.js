"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bson_1 = require("bson");
const errors_1 = require("../errors");
const utils_1 = require("../utils");
// ************************************************************************************************
class MongoCollectionDAO {
    databaseName;
    collectionName;
    collection;
    constructor(databaseName, collectionName) {
        this.databaseName = databaseName;
        this.collectionName = collectionName;
    }
    // For Tests, returns the mongo client for custom functions
    getDBClient() {
        return this.collection;
    }
    async injectClient(client) {
        try {
            this.collection = await client
                .db(this.databaseName)
                .collection(this.collectionName);
            utils_1.logger.log({
                level: 'verbose',
                message: `📖 Accessing "${this.collectionName}" collection`,
                consoleLoggerOptions: { label: 'MongoDB' },
            });
        }
        catch (error) {
            throw new errors_1.ApplicationError(`Unable to connect to ${this.collectionName} collection`, 500, true, error);
        }
    }
    async save(query, update, options = { upsert: true }, skipSave = false) {
        try {
            if (!skipSave) {
                return await this.collection
                    .updateOne(query, update, options)
                    .then((updatedDocument) => {
                    if (updatedDocument.matchedCount > 0) {
                        console.log(`Successfully Saved "${this.collectionName}"`);
                    }
                    else {
                        console.log('No document matches the provided query.');
                    }
                });
            }
            return console.log(`"${this.collectionName}" Save Skipped`);
        }
        catch (error) {
            throw new errors_1.ApplicationError(`Unable to Save "${this.collectionName}" document`, 500, true, error);
        }
    }
    async getById(id, options = {}) {
        try {
            const query = { _id: new bson_1.ObjectId(id) };
            const document = await this.collection.findOne(query, options);
            return document;
        }
        catch (error) {
            throw new errors_1.ApplicationError(`Unable to get "${this.collectionName}" document by Id`, 500, true, error);
        }
    }
    async insertMany(docArray) {
        try {
            return await this.collection
                .insertMany(docArray)
                .then((updatedDocument) => {
                if (updatedDocument) {
                    console.log(`Successfully Created "${this.collectionName}" documents`);
                }
                else {
                    console.log('No document matches the provided query.');
                }
                return updatedDocument;
            })
                .catch((error) => {
                utils_1.logger.debug('Skipped');
                return error;
            });
        }
        catch (error) {
            throw new errors_1.ApplicationError(`Unable to save "${this.collectionName}" documents`, 500, true, error);
        }
    }
    // Intended for testing only
    async deleteMany(docArray) {
        try {
            const docIds = docArray.map((doc) => doc._id);
            const filter = {
                _id: { $in: docIds },
            };
            return await this.collection
                .deleteMany(filter)
                .then((updatedDocument) => {
                if (updatedDocument) {
                    console.log(`Successfully Deleted "${this.collectionName}" documents`);
                }
                else {
                    console.log('No document matches the provided query.');
                }
            })
                .catch((error) => {
                utils_1.logger.error('Skip any insert Errors');
                return error;
            });
        }
        catch (error) {
            throw new errors_1.ApplicationError(`Unable to Save "${this.collectionName}" documents`, 500, true, error);
        }
    }
    async getLastInsertedDoc() {
        try {
            return this.collection.find({}).sort({ _id: -1 }).limit(1).next();
        }
        catch (error) {
            throw new errors_1.ApplicationError('Unable to get Last Inserted Document', 500, true, error);
        }
    }
    async delete(id) {
        try {
            const filter = { _id: new bson_1.ObjectId(id) };
            return this.collection.deleteOne(filter);
        }
        catch (error) {
            throw new errors_1.ApplicationError('Transaction Not Deleted', 500, true, error);
        }
    }
}
exports.default = MongoCollectionDAO;
//# sourceMappingURL=MongoCollection.DAO.js.map