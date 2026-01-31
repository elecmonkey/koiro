import "dotenv/config";
import crypto from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { prisma } from "../src/lib/prisma";

const PERMISSIONS = {
  VIEW: 1,
  DOWNLOAD: 2,
  UPLOAD: 4,
  ADMIN: 8,
} as const;

type PermissionKey = keyof typeof PERMISSIONS;

type Answers = {
  email: string;
  password: string;
  permissions: number;
};

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function promptPermissions(rl: ReturnType<typeof createInterface>) {
  let mask = 0;
  const order: PermissionKey[] = ["VIEW", "DOWNLOAD", "UPLOAD", "ADMIN"];

  for (const key of order) {
    const answer = await rl.question(`授予 ${key} 权限? (y/N): `);
    if (answer.trim().toLowerCase() === "y") {
      mask |= PERMISSIONS[key];
    }
  }

  return mask;
}

async function prompt() {
  const rl = createInterface({ input, output });
  const rlAny = rl as typeof rl & {
    stdoutMuted?: boolean;
    _writeToOutput?: (str: string) => void;
  };
  const originalWrite = rlAny._writeToOutput?.bind(rl);
  if (originalWrite) {
    rlAny._writeToOutput = (str: string) => {
      if (!rlAny.stdoutMuted) {
        originalWrite(str);
      }
    };
  }

  try {
    const email = (await rl.question("邮箱: ")).trim();
    if (!email) {
      throw new Error("邮箱不能为空");
    }

    rlAny.stdoutMuted = true;
    const password = await rl.question("密码: ");
    rlAny.stdoutMuted = false;
    if (!password) {
      throw new Error("密码不能为空");
    }

    const permissions = await promptPermissions(rl);

    const answers: Answers = { email, password, permissions };
    return answers;
  } finally {
    rl.close();
  }
}

async function main() {
  const { email, password, permissions } = await prompt();
  const passwordHash = hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      permissions,
    },
  });

  console.log("用户已创建:", {
    id: user.id,
    email: user.email,
    permissions: user.permissions,
  });
}

main()
  .catch((error) => {
    console.error("创建用户失败:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
