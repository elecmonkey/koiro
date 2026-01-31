import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      permissions?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    permissions?: number;
    expiresAt?: number;
  }
}
