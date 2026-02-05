import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS, checkApiPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type StaffEntry = {
  name: string;
  count: number;
  roles: { role: string; count: number }[];
};

export async function GET(request: Request) {
  const session = await auth();
  const permissions = session?.user?.permissions;
  if (!checkApiPermission(permissions, PERMISSIONS.VIEW, true)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeSingles = searchParams.get("includeSingles") === "1";

  const songs = await prisma.song.findMany({
    select: { staff: true },
  });

  const staffMap = new Map<string, { count: number; roles: Map<string, number> }>();

  for (const song of songs) {
    const staffArray = song.staff as { role?: string; name?: string | string[] }[] | null;
    if (!staffArray || !Array.isArray(staffArray)) continue;

    for (const item of staffArray) {
      const role = (item.role || "").trim();
      const names = Array.isArray(item.name) ? item.name : [item.name || ""];
      for (const rawName of names) {
        const name = (rawName || "").trim();
        if (!name) continue;

        const entry = staffMap.get(name) ?? { count: 0, roles: new Map<string, number>() };
        entry.count += 1;
        if (role) {
          entry.roles.set(role, (entry.roles.get(role) || 0) + 1);
        }
        staffMap.set(name, entry);
      }
    }
  }

  const staff: StaffEntry[] = Array.from(staffMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      roles: Array.from(data.roles.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .filter((item) => includeSingles || item.count > 1)
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ staff });
}
