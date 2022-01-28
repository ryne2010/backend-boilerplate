// Modules
import { AutoEncryptionOptions, Document, MongoClient } from 'mongodb';
import { ClientEncryption } from 'mongodb-client-encryption';
import logger from './gcp-logging';
// Utils
import { getGCPSecret } from './gcp-secret';
export class MongoConnectionClass {
  private mongoUri: string | undefined;
  regularClient?: MongoClient;
  csfleClient?: MongoClient;
  connectionString: string;
  reconnectionTries: number;
  // Callbacks
  static getRegularClient: any;
  static closeAllConnections: any;
  kmsProviders: AutoEncryptionOptions['kmsProviders'] | undefined;
  keyAltNames: string[];
  schemaMap: Document | undefined;
  keyDB: string;
  keyColl: string;
  keyVaultNamespace: string;

  /** Callback when Mongo config data is fetched from GCP */
  constructor({
    mongoUri = undefined,
    connectionString = '',
    kmsProviders = undefined,
    keyAltNames = [],
    keyDB = 'encryption',
    keyColl = '__keyVaultkms',
  } = {}) {
    this.mongoUri = mongoUri;
    this.connectionString = connectionString;
    this.regularClient = undefined;
    this.reconnectionTries = 0;
    this.kmsProviders = kmsProviders;
    this.keyAltNames = keyAltNames;
    this.schemaMap = undefined;
    this.keyDB = keyDB;
    this.keyColl = keyColl;
    this.keyVaultNamespace = `${keyDB}.${keyColl}`;
  }
  /** Get Mongo Config from GCP */
  public async getMongoUri(): Promise<string> {
    if (this.mongoUri) {
      return this.mongoUri;
    }
    try {
      // Development / Testing
      if (
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test'
      ) {
        logger.log({
          level: 'verbose',
          message: '🏃‍♂️ Fetching Mongo URI from GCP for local development',
          consoleLoggerOptions: { label: 'GCP Secrets' },
        });
        this.mongoUri = (await getGCPSecret('GCP_MONGO_LOCAL_URI')) as string;
        return this.mongoUri;
      }

      // GCP Development / Production
      if (!process.env.GCP_MONGO_URI_GCR_VENDRIX_API)
        throw new Error('No env variable for Mongo URI Secret');
      logger.log({
        level: 'verbose',
        message: '🏃‍♂️ Fetching Mongo URI from GCP for cloud runtime',
        consoleLoggerOptions: { label: 'API' },
      });
      this.mongoUri = (await getGCPSecret(
        process.env.GCP_MONGO_URI_GCR_VENDRIX_API
      )) as string;
      return this.mongoUri;
    } catch (error) {
      logger.error(error);
      throw new Error(error as string);
    }
  }

  // Get Non-CSFLE enabled client to find or create keys
  public async closeAllConnections(): Promise<void> {
    logger.info({
      level: 'verbose',
      message: '🔌 Closing the DB Connections',
      consoleLoggerOptions: { label: 'MongoDB' },
    });

    if (this.regularClient) {
      await this.regularClient.close();
    }
  }
  private async ensureUniqueIndexOnKeyVault(client: MongoClient) {
    try {
      await client
        .db(this.keyDB)
        .collection(this.keyColl)
        .createIndex('keyAltNames', {
          unique: true,
          partialFilterExpression: {
            keyAltNames: {
              $exists: true,
            },
          },
        });
    } catch (e) {
      console.error(e);
    }
  }

  private async findOrCreateDataKeys() {
    const client = await this.getRegularClient();
    const dataKeys = await client
      .db(this.keyDB)
      .collection(this.keyColl)
      .find({ keyAltNames: { $in: this.keyAltNames } })
      .toArray();

    const keysObject: Document = {};
    // Load keys into new object based on name

    dataKeys.forEach((key) => {
      key.keyAltNames.forEach((name: string) => (keysObject[name] = key._id));
    });
    const existingKeys = Object.keys(keysObject);

    const createAnyNewKeys = this.keyAltNames.map(async (name) => {
      if (!existingKeys.includes(name)) {
        await this.ensureUniqueIndexOnKeyVault(client);
        const encryption = new ClientEncryption(client, {
          keyVaultNamespace: this.keyVaultNamespace,
          kmsProviders: this.kmsProviders,
        });
        console.log(`Creating Key for ${name}`);
        await encryption
          .createDataKey('gcp', {
            masterKey: {
              projectId: process.env.KMS_KEY_RING as string,
              location: process.env.KMS_LOCATION as string,
              keyRing: process.env.KMS_KEY_RING as string,
              keyName: 'csfle-master',
            },
            keyAltNames: [name],
          })
          .then((resp) => {
            keysObject[name] = resp;
          })
          .catch((e) => {
            console.log(e);
          });
      }
    });
    await Promise.all(createAnyNewKeys);
    // ! Don't Close the helper client connection as it is used as the "Regular Client"
    return keysObject;
  }

  private async createJsonSchemaMap() {
    const dataKeys = await this.findOrCreateDataKeys();
    this.schemaMap = {
      'vendrix.users': {
        bsonType: 'object',
        encryptMetadata: {
          keyId: [dataKeys['users']],
        },
        properties: {
          mobilePhoneNumber: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          cardHolderEmail: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
        },
      },
      'vendrix.cards': {
        bsonType: 'object',
        encryptMetadata: {
          keyId: [dataKeys['cards']],
        },
        properties: {
          employeeNumber: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          cardNumber: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          accountCode: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          customerIdP: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          customerIdV: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          cardExpiration: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
        },
      },
      'vendrix.companies': {
        bsonType: 'object',
        encryptMetadata: {
          keyId: [dataKeys['companies']],
        },
        properties: {
          accountCode: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          customerIdP: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          customerIdV: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          customerIdG: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
        },
      },
    };
    return this.schemaMap;
  }

  public async getRegularClient(): Promise<MongoClient> {
    if (this.regularClient) {
      return await this.regularClient.connect();
    }

    if (!this.mongoUri) {
      await this.getMongoUri();
    }

    return new MongoClient(this.mongoUri as string, {})
      .connect()
      .then((client) => {
        logger.info({
          level: 'verbose',
          message:
            '🔌 Connected successfully to Mongo DB Atlas (NEW REGULAR CONNECTION)',
          consoleLoggerOptions: { label: 'MongoDB' },
        });

        this.regularClient = client;

        return this.regularClient;
      })
      .catch((error) => {
        logger.error('Cannot connect to MongoDB URI. Check the URI string.');
        throw new Error(error as string);
      });
  }

  public async getCsfleEnabledClient(): Promise<MongoClient> {
    if (!this.kmsProviders || !this.keyAltNames) {
      this.kmsProviders = {
        gcp: {
          email: process.env.GCP_KMS_VAULT_SERVICE_ACCOUNT as string,
          privateKey: await getGCPSecret(
            process.env.GCP_CSFLE_MASTER_KMS as string
          ),
        },
      };
      this.keyAltNames = ['users', 'cards', 'companies'];
    }
    if (!this.mongoUri) {
      await this.getMongoUri();
    }

    if (!this.schemaMap) {
      await this.createJsonSchemaMap();
    }

    return new MongoClient(this.mongoUri as string, {
      monitorCommands: true,
      autoEncryption: {
        keyVaultNamespace: this.keyVaultNamespace,
        kmsProviders: this.kmsProviders,
        schemaMap: this.schemaMap,
      },
    })
      .connect()
      .then((client) => {
        logger.info({
          level: 'verbose',
          message:
            '🔌 Connected successfully to Mongo DB Atlas (NEW CSFLE CONNECTION)',
          consoleLoggerOptions: { label: 'MongoDB' },
        });

        this.csfleClient = client;

        return this.csfleClient;
      })
      .catch((error) => {
        logger.error('Cannot connect to MongoDB URI. Check the URI string.');
        throw new Error(error as string);
      });
  }
}
const MongoConnection = new MongoConnectionClass();
export default MongoConnection;
