import "dotenv/config";
import crypto from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/db/src/generated/prisma/client";

// 初始化 Prisma 客户端
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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

async function promptPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    
    const chars: string[] = [];
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    
    const onData = (char: string) => {
      const code = char.charCodeAt(0);
      
      if (code === 13 || code === 10) {
        // Enter
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(chars.join(""));
      } else if (code === 127 || code === 8) {
        // Backspace
        if (chars.length > 0) {
          chars.pop();
          process.stdout.write("\b \b");
        }
      } else if (code === 3) {
        // Ctrl+C
        process.exit(1);
      } else if (code >= 32) {
        // Printable character
        chars.push(char);
        process.stdout.write("*");
      }
    };
    
    process.stdin.on("data", onData);
  });
}

async function prompt() {
  const rl = createInterface({ input, output });

  try {
    const email = (await rl.question("邮箱: ")).trim();
    if (!email) {
      throw new Error("邮箱不能为空");
    }

    rl.close();
    const password = await promptPassword("密码: ");
    if (!password) {
      throw new Error("密码不能为空");
    }

    const rl2 = createInterface({ input, output });
    const permissions = await promptPermissions(rl2);
    rl2.close();

    const answers: Answers = { email, password, permissions };
    return answers;
  } catch (e) {
    rl.close();
    throw e;
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
