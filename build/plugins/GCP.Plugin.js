"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGCPp12 = exports.getGCPSecret = void 0;
// Modules
const secret_manager_1 = require("@google-cloud/secret-manager");
// Utils
const utils_1 = require("../utils");
const errors_1 = require("../errors");
// *******************************************************************************
/**
 * @summary Get GCP secret as buffer
 *
 * @param secretName
 * @param secretVersion
 * @returns
 */
async function getGCPSecretAsBuffer(secretName, secretVersion = 'latest') {
    const client = new secret_manager_1.SecretManagerServiceClient();
    const project = process.env.GCP_PROJECT_CONFIG;
    const name = `${project}/secrets/${secretName}/versions/${secretVersion}`;
    utils_1.logger.log({
        level: 'verbose',
        message: `🏃‍♂️ Fetching "${name}" secret`,
        consoleLoggerOptions: { label: 'GCP Secrets' },
    });
    try {
        const [accessResponse] = await client
            .accessSecretVersion({ name })
            .catch((error) => {
            throw new errors_1.ApplicationError(error);
        });
        if (accessResponse?.payload?.data) {
            const dataString = accessResponse.payload.data;
            const data = dataString instanceof Buffer ? dataString : Buffer.from(dataString);
            return data;
        }
        else {
            throw new errors_1.ApplicationError('No payload returned from SecretManagerServiceClient');
        }
    }
    catch (error) {
        utils_1.logger.error(error);
        throw new errors_1.ApplicationError(error);
    }
}
/**
 * @summary Get GCP secret as string
 *
 * @param secretName
 * @param secretVersion
 * @returns
 */
async function getGCPSecret(secretName, secretVersion = 'latest') {
    try {
        const buffer = await getGCPSecretAsBuffer(secretName, secretVersion);
        return buffer.toString('utf8');
    }
    catch (error) {
        utils_1.logger.error(error);
        throw new errors_1.ApplicationError(error);
    }
}
exports.getGCPSecret = getGCPSecret;
/**
 * @summary Get GCP secret as binary string
 *
 * @param secretName
 * @param secretVersion
 * @returns
 */
async function getGCPp12(secretName, secretVersion = 'latest') {
    try {
        const buffer = await getGCPSecretAsBuffer(secretName, secretVersion);
        return buffer.toString('binary');
    }
    catch (error) {
        utils_1.logger.error(error);
        throw new errors_1.ApplicationError(error);
    }
}
exports.getGCPp12 = getGCPp12;
//# sourceMappingURL=GCP.Plugin.js.map