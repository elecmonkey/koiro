import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { auth } from "@/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT - 更新用户权限
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const newPermissions = body.permissions;

  if (typeof newPermissions !== "number" || newPermissions < 0 || newPermissions > 15) {
    return NextResponse.json({ error: "无效的权限值" }, { status: 400 });
  }

  // 检查是否修改自己
  if (session.user.id === id) {
    return NextResponse.json({ error: "不能修改自己的权限" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { permissions: newPermissions },
  });

  return NextResponse.json({ ok: true });
}

// DELETE - 删除用户
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 检查是否删除自己
  if (session.user.id === id) {
    return NextResponse.json({ error: "不能删除自己" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// PATCH - 重置用户密码或编辑昵称
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  const permissions = session?.user?.permissions ?? 0;
  if (!session?.user || !hasPermission(permissions, PERMISSIONS.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { password, displayName } = body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // 重置密码
  if (password !== undefined) {
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  }

  // 编辑昵称
  if (displayName !== undefined) {
    if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
      return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    }

    if (displayName.trim().length > 50) {
      return NextResponse.json({ error: "昵称不能超过50个字符" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { displayName: displayName.trim() },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "没有提供要更新的内容" }, { status: 400 });
}
