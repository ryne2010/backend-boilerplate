// Modules
import {
  MongoClient,
  Collection,
  Document,
  Filter,
  UpdateFilter,
  UpdateOptions,
  FindOptions,
  InsertManyResult,
  DeleteResult,
} from 'mongodb';
import { ObjectId } from 'bson';

import { ApplicationError } from '../errors';

import { logger } from '../utils';

// ************************************************************************************************
export default class MongoCollectionDAO {
  databaseName: string;
  collectionName: string;

  public collection!: Collection<Document>;

  constructor(databaseName: string, collectionName: string) {
    this.databaseName = databaseName;
    this.collectionName = collectionName;
  }

  // For Tests, returns the mongo client for custom functions
  public getDBClient(): Collection<Document> {
    return this.collection;
  }

  public async injectClient(client: MongoClient): Promise<void> {
    try {
      this.collection = await client
        .db(this.databaseName)
        .collection(this.collectionName);

      logger.log({
        level: 'verbose',
        message: `📖 Accessing "${this.collectionName}" collection`,
        consoleLoggerOptions: { label: 'MongoDB' },
      });
    } catch (error) {
      throw new ApplicationError(
        `Unable to connect to ${this.collectionName} collection`,
        500,
        true,
        error as string
      );
    }
  }

  public async save(
    query: Filter<Document>,
    update: UpdateFilter<Document>,
    options: UpdateOptions = { upsert: true },
    skipSave = false
  ): Promise<void> {
    try {
      if (!skipSave) {
        return await this.collection
          .updateOne(query, update, options)
          .then((updatedDocument) => {
            if (updatedDocument.matchedCount > 0) {
              console.log(`Successfully Saved "${this.collectionName}"`);
            } else {
              console.log('No document matches the provided query.');
            }
          });
      }
      return console.log(`"${this.collectionName}" Save Skipped`);
    } catch (error) {
      throw new ApplicationError(
        `Unable to Save "${this.collectionName}" document`,
        500,
        true,
        error as string
      );
    }
  }

  public async getById(
    id: string,
    options: FindOptions<Document> = {}
  ): Promise<Document | null> {
    try {
      const query: Filter<Document> = { _id: new ObjectId(id) };

      const document = await this.collection.findOne(query, options);
      return document;
    } catch (error) {
      throw new ApplicationError(
        `Unable to get "${this.collectionName}" document by Id`,
        500,
        true,
        error as string
      );
    }
  }

  public async insertMany(
    docArray: (Document & {
      _id?: ObjectId | undefined;
    })[]
  ): Promise<InsertManyResult<Document> | void> {
    try {
      return await this.collection
        .insertMany(docArray)
        .then((updatedDocument) => {
          if (updatedDocument) {
            console.log(
              `Successfully Created "${this.collectionName}" documents`
            );
          } else {
            console.log('No document matches the provided query.');
          }
          return updatedDocument;
        })
        .catch((error) => {
          logger.debug('Skipped');
          return error;
        });
    } catch (error) {
      throw new ApplicationError(
        `Unable to save "${this.collectionName}" documents`,
        500,
        true,
        error as string
      );
    }
  }

  // Intended for testing only
  public async deleteMany(docArray: Document[]): Promise<void> {
    try {
      const docIds: ObjectId[] = docArray.map((doc) => doc._id);
      const filter: Filter<Document> = {
        _id: { $in: docIds },
      };

      return await this.collection
        .deleteMany(filter)
        .then((updatedDocument) => {
          if (updatedDocument) {
            console.log(
              `Successfully Deleted "${this.collectionName}" documents`
            );
          } else {
            console.log('No document matches the provided query.');
          }
        })
        .catch((error) => {
          logger.error('Skip any insert Errors');
          return error;
        });
    } catch (error) {
      throw new ApplicationError(
        `Unable to Save "${this.collectionName}" documents`,
        500,
        true,
        error as string
      );
    }
  }

  public async getLastInsertedDoc(): Promise<Document | null> {
    try {
      return this.collection.find({}).sort({ _id: -1 }).limit(1).next();
    } catch (error) {
      throw new ApplicationError(
        'Unable to get Last Inserted Document',
        500,
        true,
        error as string
      );
    }
  }

  public async delete(id: string): Promise<DeleteResult | null> {
    try {
      const filter: Filter<Document> = { _id: new ObjectId(id) };

      return this.collection.deleteOne(filter);
    } catch (error) {
      throw new ApplicationError(
        'Transaction Not Deleted',
        500,
        true,
        error as string
      );
    }
  }
}
