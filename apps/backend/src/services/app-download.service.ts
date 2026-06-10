import { Client } from 'minio';
import { env } from '../config/env';

const DOWNLOAD_ERROR_MESSAGE = 'App download is currently unavailable. Please try again later.';

function createClient(): Client {
  return new Client({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    useSSL: env.MINIO_USE_SSL,
  });
}

export async function getPresignedApkUrl(): Promise<string> {
  if (!env.MINIO_BUCKET_NAME || !env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
    throw new Error(DOWNLOAD_ERROR_MESSAGE);
  }

  const client = createClient();
  await client.statObject(env.MINIO_BUCKET_NAME, env.MINIO_APK_OBJECT_KEY);
  return client.presignedGetObject(env.MINIO_BUCKET_NAME, env.MINIO_APK_OBJECT_KEY, 60);
}

export { DOWNLOAD_ERROR_MESSAGE };
