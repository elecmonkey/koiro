import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { PutObjectCommand, buildObjectKey, s3Client } from "@/lib/s3";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

const bucket = process.env.S3_BUCKET;
const endpoint = process.env.S3_ENDPOINT;
const bucketEndpoint = process.env.S3_BUCKET_ENDPOINT === "true";
const prefix = process.env.S3_PREFIX ?? "";
const MAX_BYTES = 30 * 1024 * 1024;

if (!bucket && !bucketEndpoint) {
  throw new Error("S3_BUCKET is not set");
}
if (bucketEndpoint && !endpoint) {
  throw new Error("S3_ENDPOINT is not set for bucket endpoint mode");
}

type Body = {
  url: string;
  folder?: "img" | "music" | "";
};

export async function POST(request: Request) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.UPLOAD)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body?.url) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let remoteUrl: URL;
  try {
    remoteUrl = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const res = await fetch(remoteUrl, { method: "GET" });
  if (!res.ok) {
    return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 400 });
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image/* is allowed" }, { status: 400 });
  }

  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const data = await res.arrayBuffer();
  if (data.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const ext = extFromContentType(contentType) ?? extFromUrl(remoteUrl) ?? "jpg";
  const objectName = `${crypto.randomUUID()}.${ext}`;
  const key = buildObjectKey(prefix, body.folder ?? "img", objectName);

  const command = new PutObjectCommand({
    Bucket: bucketEndpoint ? endpoint : bucket,
    Key: key,
    Body: Buffer.from(data),
    ContentType: contentType,
  });

  await s3Client.send(command);

  return NextResponse.json({ objectId: key });
}

function extFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return null;
}

function extFromUrl(url: URL) {
  const base = url.pathname.split("/").pop();
  if (!base || !base.includes(".")) return null;
  const ext = base.split(".").pop();
  return ext ? ext.toLowerCase() : null;
}
