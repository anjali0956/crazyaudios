import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { emailMatcher, normalizeEmail } from "@/lib/email";

// Compared against when the email is unknown, so a wrong email takes as long
// as a wrong password and the two can't be told apart.
const DUMMY_PASSWORD_HASH = "$2b$10$fSmAmM4yf9euItVoeNsi9u98B0YfvsZjyrqpGqStNOjIRHRRjctTG";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },

      // Returns null for every failure: the login form shows one message for
      // "no such account" and "wrong password".
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        await dbConnect();

        // New accounts are stored lowercase; older ones may have capitals.
        const user =
          (await User.findOne({ email })) || (await User.findOne({ email: emailMatcher(email) }));

        if (!user?.password) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        // Account id (JWT subject); orders are linked to it at checkout.
        session.user.id = token.sub;
      }
      return session;
    }
  },

  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
