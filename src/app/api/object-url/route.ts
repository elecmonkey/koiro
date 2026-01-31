import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { s3Client } from "@/lib/s3";

const bucket = process.env.S3_BUCKET;
const endpoint = process.env.S3_ENDPOINT;
const bucketEndpoint = process.env.S3_BUCKET_ENDPOINT === "true";

if (!bucket && !bucketEndpoint) {
  throw new Error("S3_BUCKET is not set");
}
if (bucketEndpoint && !endpoint) {
  throw new Error("S3_ENDPOINT is not set for bucket endpoint mode");
}

type Body = {
  objectId: string;
};

export async function POST(request: Request) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.VIEW)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body?.objectId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const command = new GetObjectCommand({
    Bucket: bucketEndpoint ? endpoint : bucket,
    Key: body.objectId,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
  return NextResponse.json({ url });
}
