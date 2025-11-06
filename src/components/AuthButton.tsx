"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button, Box, Text, Spinner } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
    return (
      <Box style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Spinner size="2" />
        <Text size="2" style={{ color: "#666" }}>
          Loading...
        </Text>
      </Box>
    );
  }

  if (!session) {
    return (
      <Button onClick={() => router.push("/login")} size="2" color="blue">
        Sign In
      </Button>
    );
  }

  return (
    <Box style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <Text size="2" style={{ color: "#666" }}>
        {session.user?.email}
      </Text>
      <Button
        onClick={async () => {
          await signOut();
          router.push("/login");
        }}
        size="2"
        color="gray"
        variant="soft"
      >
        Sign Out
      </Button>
    </Box>
  );
}
