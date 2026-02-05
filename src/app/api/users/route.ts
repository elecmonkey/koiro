import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

// GET - 获取所有用户
export async function GET(request: NextRequest) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const keyword = searchParams.get("q")?.trim();

  const where = keyword
    ? {
        OR: [
          { email: { contains: keyword, mode: "insensitive" as const } },
          { displayName: { contains: keyword, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const total = await prisma.user.count({ where });

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      email: true,
      displayName: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      permissions: u.permissions,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}

// POST - 创建新用户
export async function POST(request: Request) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, password, permissions: userPermissions, displayName } = body;

  if (!email || typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "邮箱不能为空" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }
  if (typeof userPermissions !== "number" || userPermissions < 0 || userPermissions > 15) {
    return NextResponse.json({ error: "无效的权限值" }, { status: 400 });
  }

  // displayName 默认为邮箱
  const finalDisplayName = (displayName && typeof displayName === "string" && displayName.trim())
    ? displayName.trim()
    : email.trim();

  // 检查邮箱是否已存在
  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) {
    return NextResponse.json({ error: "该邮箱已被注册" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.trim(),
      displayName: finalDisplayName,
      passwordHash,
      permissions: userPermissions,
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      permissions: user.permissions,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
}
