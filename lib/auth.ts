import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { adminLoginSchema } from "./validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/admin/login",
  },
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = adminLoginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const admin = await prisma.adminUser.findUnique({
          where: { email: parsed.data.email },
        });

        if (!admin?.isActive) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, admin.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    redirect({ baseUrl, url }) {
      if (url.startsWith("/admin") && !url.startsWith("/admin/login")) {
        return `${baseUrl}${url}`;
      }

      if (url.startsWith(baseUrl)) {
        const nextUrl = new URL(url);

        if (nextUrl.pathname.startsWith("/admin") && nextUrl.pathname !== "/admin/login") {
          return url;
        }
      }

      return `${baseUrl}/admin`;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.sub;
        (session.user as { id?: string; role?: string }).role = token.role as string | undefined;
      }

      return session;
    },
  },
});
