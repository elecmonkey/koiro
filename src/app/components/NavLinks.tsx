import Link from "next/link";
import { Stack, Button } from "@mui/material";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

type NavLinksProps = {
  permissions?: number;
};

export default function NavLinks({ permissions = 0 }: NavLinksProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Link href="/search" style={{ textDecoration: "none" }}>
        <Button variant="text" size="small">
          搜索
        </Button>
      </Link>
      {hasPermission(permissions, PERMISSIONS.UPLOAD) ? (
        <Link href="/upload" style={{ textDecoration: "none" }}>
          <Button variant="text" size="small">
            上传
          </Button>
        </Link>
      ) : null}
      {hasPermission(permissions, PERMISSIONS.ADMIN) ? (
        <Link href="/admin" style={{ textDecoration: "none" }}>
          <Button variant="text" size="small">
            管理
          </Button>
        </Link>
      ) : null}
    </Stack>
  );
}
