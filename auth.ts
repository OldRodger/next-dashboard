import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { sql } from "./app/lib/db";
import { User } from "./app/lib/definitions";
import bcrypt from "bcryptjs";
const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLogedIn = Boolean(auth?.user);
      const pathname = request.nextUrl.pathname;
      const isOnDashboard = pathname.startsWith("/dashboard");

      if (isOnDashboard) return isLogedIn;

      if (isLogedIn)
        return Response.redirect(new URL("/dashboard", request.nextUrl));

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

const userCredentials = Credentials({
  async authorize(credentials) {
    // Validate input using Zod
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .safeParse(credentials);

    if (!parsed.success) {
      console.log("Validation failed:", parsed.error.flatten());
      return null;
    }

    const { email, password } = parsed.data;

    try {
      const user = await getUser(email);
      if (!user) {
        console.log("User not found");
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log("Incorrect password");
        return null;
      }

      // All checks passed, return user
      return user;
    } catch (error) {
      console.error("Authorization error:", error);
      return null;
    }
  },
});

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [userCredentials],
});

async function getUser(email: string): Promise<User | null> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0];
  } catch (error) {
    console.log("Failed to fetch user:", error);
    throw new Error("Failed to fetch user");
  }
}
