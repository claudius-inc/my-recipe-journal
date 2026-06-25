import { createAuthClient } from "better-auth/react";
import { magicLinkClient, inferAdditionalFields } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [
    passkeyClient(),
    magicLinkClient(),
    // Mirrors the server's user.additionalFields so the session user and
    // updateUser() are typed with preferredUnitSystem.
    inferAdditionalFields({
      user: { preferredUnitSystem: { type: "string" } },
    }),
  ],
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession, signOut, $fetch } = authClient;
