// Modules
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Utils
import { logger } from '../utils';
import { ApplicationError } from '../errors';

// *******************************************************************************
/**
 * @summary Get GCP secret as buffer
 *
 * @param secretName
 * @param secretVersion
 * @returns
 */
async function getGCPSecretAsBuffer(
  secretName: string,
  secretVersion = 'latest'
): Promise<Buffer> {
  const client = new SecretManagerServiceClient();
  const project = process.env.GCP_PROJECT_CONFIG;
  const name = `${project}/secrets/${secretName}/versions/${secretVersion}`;

  logger.log({
    level: 'verbose',
    message: `🏃‍♂️ Fetching "${name}" secret`,
    consoleLoggerOptions: { label: 'GCP Secrets' },
  });

  try {
    const [accessResponse] = await client
      .accessSecretVersion({ name })
      .catch((error) => {
        throw new ApplicationError(error as string);
      });

    if (accessResponse?.payload?.data) {
      const dataString: string | undefined | Uint8Array =
        accessResponse.payload.data;
      const data: Buffer =
        dataString instanceof Buffer ? dataString : Buffer.from(dataString);
      return data;
    } else {
      throw new ApplicationError(
        'No payload returned from SecretManagerServiceClient'
      );
    }
  } catch (error) {
    logger.error(error);
    throw new ApplicationError(error as string);
  }
}

/**
 * @summary Get GCP secret as string
 *
 * @param secretName
 * @param secretVersion
 * @returns
 */
export async function getGCPSecret(
  secretName: string,
  secretVersion = 'latest'
): Promise<string> {
  try {
    const buffer = await getGCPSecretAsBuffer(secretName, secretVersion);

    return buffer.toString('utf8');
  } catch (error) {
    logger.error(error);
    throw new ApplicationError(error as string);
  }
}

/**
 * @summary Get GCP secret as binary string
 *
 * @param secretName
 * @param secretVersion
 * @returns
 */
export async function getGCPp12(
  secretName: string,
  secretVersion = 'latest'
): Promise<string> {
  try {
    const buffer = await getGCPSecretAsBuffer(secretName, secretVersion);

    return buffer.toString('binary');
  } catch (error) {
    logger.error(error);
    throw new ApplicationError(error as string);
  }
}
