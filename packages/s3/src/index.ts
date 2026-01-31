import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

export interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  bucketEndpoint?: boolean;
  prefix?: string;
}

export function createS3Config(): S3Config {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const bucketEndpoint = process.env.S3_BUCKET_ENDPOINT === "true";
  const prefix = process.env.S3_PREFIX ?? "";

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing S3 configuration in environment variables");
  }

  if (!bucket && !bucketEndpoint) {
    throw new Error("S3_BUCKET is not set");
  }

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket: bucket ?? "",
    bucketEndpoint,
    prefix,
  };
}

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    bucketEndpoint: config.bucketEndpoint,
    forcePathStyle: config.bucketEndpoint ? false : true,
  });
}

// 默认单例客户端
let defaultClient: S3Client | null = null;
let defaultConfig: S3Config | null = null;

export function getDefaultS3Client(): S3Client {
  if (!defaultClient) {
    defaultConfig = createS3Config();
    defaultClient = createS3Client(defaultConfig);
  }
  return defaultClient;
}

export function getDefaultS3Config(): S3Config {
  if (!defaultConfig) {
    defaultConfig = createS3Config();
  }
  return defaultConfig;
}

// 工具函数
export function buildObjectKey(prefix: string, folder: string, filename: string): string {
  const trimmedPrefix = prefix ? prefix.replace(/\/+$/, "") + "/" : "";
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!folder) {
    return `${trimmedPrefix}${safeName}`;
  }
  return `${trimmedPrefix}${folder}/${safeName}`;
}

export function getBucketName(config: S3Config): string {
  return config.bucketEndpoint ? config.endpoint : config.bucket;
}

// S3 操作封装
export class S3Storage {
  private client: S3Client;
  private config: S3Config;

  constructor(config?: S3Config) {
    this.config = config ?? createS3Config();
    this.client = createS3Client(this.config);
  }

  get s3Client(): S3Client {
    return this.client;
  }

  get s3Config(): S3Config {
    return this.config;
  }

  private getBucket(): string {
    return getBucketName(this.config);
  }

  /**
   * 构建对象键名
   */
  buildKey(folder: string, filename: string): string {
    return buildObjectKey(this.config.prefix ?? "", folder, filename);
  }

  /**
   * 生成预签名上传 URL
   */
  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.getBucket(),
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * 生成预签名下载 URL
   */
  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.getBucket(),
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * 上传文件内容
   */
  async upload(
    key: string,
    body: Buffer | Readable | string,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<void> {
    const params: PutObjectCommandInput = {
      Bucket: this.getBucket(),
      Key: key,
      Body: body,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
    };

    // 对于大文件使用分片上传
    if (Buffer.isBuffer(body) && body.length > 5 * 1024 * 1024) {
      const upload = new Upload({
        client: this.client,
        params,
      });
      await upload.done();
    } else {
      await this.client.send(new PutObjectCommand(params));
    }
  }

  /**
   * 下载文件内容
   */
  async download(key: string): Promise<{
    body: Readable;
    contentType?: string;
    contentLength?: number;
  }> {
    const params: GetObjectCommandInput = {
      Bucket: this.getBucket(),
      Key: key,
    };
    const response = await this.client.send(new GetObjectCommand(params));
    return {
      body: response.Body as Readable,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  }

  /**
   * 检查对象是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除对象
   */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      })
    );
  }

  /**
   * 列出指定前缀下的对象
   */
  async list(
    prefix: string,
    options?: { maxKeys?: number; continuationToken?: string }
  ): Promise<{
    keys: string[];
    nextToken?: string;
  }> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.getBucket(),
        Prefix: prefix,
        MaxKeys: options?.maxKeys ?? 1000,
        ContinuationToken: options?.continuationToken,
      })
    );

    return {
      keys: response.Contents?.map((obj) => obj.Key!).filter(Boolean) ?? [],
      nextToken: response.NextContinuationToken,
    };
  }

  /**
   * 删除指定前缀下的所有对象
   */
  async deletePrefix(prefix: string): Promise<number> {
    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const { keys, nextToken } = await this.list(prefix, { continuationToken });
      for (const key of keys) {
        await this.delete(key);
        deleted++;
      }
      continuationToken = nextToken;
    } while (continuationToken);

    return deleted;
  }
}

// 导出便捷的默认实例
let defaultStorage: S3Storage | null = null;

export function getDefaultStorage(): S3Storage {
  if (!defaultStorage) {
    defaultStorage = new S3Storage();
  }
  return defaultStorage;
}

// Re-export SDK types for convenience
export {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
export { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export { Upload } from "@aws-sdk/lib-storage";
