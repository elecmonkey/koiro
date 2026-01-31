import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const bucketEndpoint = process.env.S3_BUCKET_ENDPOINT === "true";

if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
  throw new Error("Missing S3 configuration in environment variables");
}

export const s3Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  bucketEndpoint,
  forcePathStyle: bucketEndpoint ? false : true,
});

export function buildObjectKey(prefix: string, folder: string, filename: string) {
  const trimmedPrefix = prefix ? prefix.replace(/\/+$/, "") + "/" : "";
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!folder) {
    return `${trimmedPrefix}${safeName}`;
  }
  return `${trimmedPrefix}${folder}/${safeName}`;
}
