import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { PutObjectCommand, getSignedUrl, buildObjectKey, s3Client } from "@/lib/s3";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

const bucket = process.env.S3_BUCKET;
const endpoint = process.env.S3_ENDPOINT;
const bucketEndpoint = process.env.S3_BUCKET_ENDPOINT === "true";
const prefix = process.env.S3_PREFIX ?? "";

if (!bucket && !bucketEndpoint) {
  throw new Error("S3_BUCKET is not set");
}
if (bucketEndpoint && !endpoint) {
  throw new Error("S3_ENDPOINT is not set for bucket endpoint mode");
}

type Body = {
  filename: string;
  contentType: string;
  folder?: "music" | "img" | "";
};

export async function POST(request: Request) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.UPLOAD)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body?.filename || !body?.contentType) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ext = body.filename.split(".").pop() ?? "bin";
  const objectName = `${crypto.randomUUID()}.${ext}`;
  const key = buildObjectKey(prefix, body.folder ?? "", objectName);

  const command = new PutObjectCommand({
    Bucket: bucketEndpoint ? endpoint : bucket,
    Key: key,
    ContentType: body.contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });

  return NextResponse.json({
    url,
    key,
    objectId: key,
  });
}
