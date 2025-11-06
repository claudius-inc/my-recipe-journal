import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { prisma } from "./prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    magicLink({
      async sendMagicLink(data) {
        const { email, url } = data;

        await resend.emails.send({
          from: process.env.FROM_EMAIL || "onboarding@resend.dev",
          to: email,
          subject: "Your Magic Link",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Welcome to My Recipe Journal</h1>
              <p style="color: #666; font-size: 16px;">Click the link below to sign in:</p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Sign In</a>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">This link expires in 10 minutes.</p>
              <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      },
    }),
  ],
});
