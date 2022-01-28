"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoConnectionClass = void 0;
// Modules
const mongodb_1 = require("mongodb");
const mongodb_client_encryption_1 = require("mongodb-client-encryption");
const gcp_logging_1 = __importDefault(require("./gcp-logging"));
// Utils
const gcp_secret_1 = require("./gcp-secret");
class MongoConnectionClass {
    mongoUri;
    regularClient;
    csfleClient;
    connectionString;
    reconnectionTries;
    // Callbacks
    static getRegularClient;
    static closeAllConnections;
    kmsProviders;
    keyAltNames;
    schemaMap;
    keyDB;
    keyColl;
    keyVaultNamespace;
    /** Callback when Mongo config data is fetched from GCP */
    constructor({ mongoUri = undefined, connectionString = '', kmsProviders = undefined, keyAltNames = [], keyDB = 'encryption', keyColl = '__keyVaultkms', } = {}) {
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
    async getMongoUri() {
        if (this.mongoUri) {
            return this.mongoUri;
        }
        try {
            // Development / Testing
            if (process.env.NODE_ENV === 'development' ||
                process.env.NODE_ENV === 'test') {
                gcp_logging_1.default.log({
                    level: 'verbose',
                    message: '🏃‍♂️ Fetching Mongo URI from GCP for local development',
                    consoleLoggerOptions: { label: 'GCP Secrets' },
                });
                this.mongoUri = (await (0, gcp_secret_1.getGCPSecret)('GCP_MONGO_LOCAL_URI'));
                return this.mongoUri;
            }
            // GCP Development / Production
            if (!process.env.GCP_MONGO_URI_GCR_VENDRIX_API)
                throw new Error('No env variable for Mongo URI Secret');
            gcp_logging_1.default.log({
                level: 'verbose',
                message: '🏃‍♂️ Fetching Mongo URI from GCP for cloud runtime',
                consoleLoggerOptions: { label: 'API' },
            });
            this.mongoUri = (await (0, gcp_secret_1.getGCPSecret)(process.env.GCP_MONGO_URI_GCR_VENDRIX_API));
            return this.mongoUri;
        }
        catch (error) {
            gcp_logging_1.default.error(error);
            throw new Error(error);
        }
    }
    // Get Non-CSFLE enabled client to find or create keys
    async closeAllConnections() {
        gcp_logging_1.default.info({
            level: 'verbose',
            message: '🔌 Closing the DB Connections',
            consoleLoggerOptions: { label: 'MongoDB' },
        });
        if (this.regularClient) {
            await this.regularClient.close();
        }
    }
    async ensureUniqueIndexOnKeyVault(client) {
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
        }
        catch (e) {
            console.error(e);
        }
    }
    async findOrCreateDataKeys() {
        const client = await this.getRegularClient();
        const dataKeys = await client
            .db(this.keyDB)
            .collection(this.keyColl)
            .find({ keyAltNames: { $in: this.keyAltNames } })
            .toArray();
        const keysObject = {};
        // Load keys into new object based on name
        dataKeys.forEach((key) => {
            key.keyAltNames.forEach((name) => (keysObject[name] = key._id));
        });
        const existingKeys = Object.keys(keysObject);
        const createAnyNewKeys = this.keyAltNames.map(async (name) => {
            if (!existingKeys.includes(name)) {
                await this.ensureUniqueIndexOnKeyVault(client);
                const encryption = new mongodb_client_encryption_1.ClientEncryption(client, {
                    keyVaultNamespace: this.keyVaultNamespace,
                    kmsProviders: this.kmsProviders,
                });
                console.log(`Creating Key for ${name}`);
                await encryption
                    .createDataKey('gcp', {
                    masterKey: {
                        projectId: process.env.KMS_KEY_RING,
                        location: process.env.KMS_LOCATION,
                        keyRing: process.env.KMS_KEY_RING,
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
    async createJsonSchemaMap() {
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
    async getRegularClient() {
        if (this.regularClient) {
            return await this.regularClient.connect();
        }
        if (!this.mongoUri) {
            await this.getMongoUri();
        }
        return new mongodb_1.MongoClient(this.mongoUri, {})
            .connect()
            .then((client) => {
            gcp_logging_1.default.info({
                level: 'verbose',
                message: '🔌 Connected successfully to Mongo DB Atlas (NEW REGULAR CONNECTION)',
                consoleLoggerOptions: { label: 'MongoDB' },
            });
            this.regularClient = client;
            return this.regularClient;
        })
            .catch((error) => {
            gcp_logging_1.default.error('Cannot connect to MongoDB URI. Check the URI string.');
            throw new Error(error);
        });
    }
    async getCsfleEnabledClient() {
        if (!this.kmsProviders || !this.keyAltNames) {
            this.kmsProviders = {
                gcp: {
                    email: process.env.GCP_KMS_VAULT_SERVICE_ACCOUNT,
                    privateKey: await (0, gcp_secret_1.getGCPSecret)(process.env.GCP_CSFLE_MASTER_KMS),
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
        return new mongodb_1.MongoClient(this.mongoUri, {
            monitorCommands: true,
            autoEncryption: {
                keyVaultNamespace: this.keyVaultNamespace,
                kmsProviders: this.kmsProviders,
                schemaMap: this.schemaMap,
            },
        })
            .connect()
            .then((client) => {
            gcp_logging_1.default.info({
                level: 'verbose',
                message: '🔌 Connected successfully to Mongo DB Atlas (NEW CSFLE CONNECTION)',
                consoleLoggerOptions: { label: 'MongoDB' },
            });
            this.csfleClient = client;
            return this.csfleClient;
        })
            .catch((error) => {
            gcp_logging_1.default.error('Cannot connect to MongoDB URI. Check the URI string.');
            throw new Error(error);
        });
    }
}
exports.MongoConnectionClass = MongoConnectionClass;
const MongoConnection = new MongoConnectionClass();
exports.default = MongoConnection;
//# sourceMappingURL=MongoConnection.js.map