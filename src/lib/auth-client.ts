import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [passkeyClient(), magicLinkClient()],
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession, signOut, $fetch } = authClient;
