import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const PERMISSION_TTLS: Record<string, number> = {
  "1": 1,
  "7": 7,
  "30": 30,
  "180": 180,
};

function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, hash] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");
  if (hashBuffer.length !== derived.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, derived);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 180,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        ttlDays: { label: "TTL Days", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email?.trim();
        const password = credentials?.password ?? "";
        const ttlKey = (credentials?.ttlDays ?? "7").trim();
        const ttlDays = PERMISSION_TTLS[ttlKey] ?? 7;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        if (!verifyPassword(password, user.passwordHash)) {
          return null;
        }

        const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000;

        return {
          id: user.id,
          email: user.email,
          permissions: user.permissions,
          expiresAt,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.permissions = (user as { permissions: number }).permissions;
        token.expiresAt = (user as { expiresAt: number }).expiresAt;
        token.exp = Math.floor(((user as { expiresAt: number }).expiresAt ?? 0) / 1000);
      }

      if (token.expiresAt && Date.now() > token.expiresAt) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      if (token?.permissions !== undefined) {
        session.user.permissions = token.permissions as number;
      }
      if (token?.expiresAt) {
        session.expires = new Date(token.expiresAt as number).toISOString();
      }
      return session;
    },
  },
});
