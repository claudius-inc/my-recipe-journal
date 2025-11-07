"use client";

import { Box, Heading } from "@radix-ui/themes";
import { AuthButton } from "../AuthButton";

export function Header() {
  return (
    <Box
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      className="dark:bg-neutral-900 dark:border-neutral-800"
    >
      {/* Logo/Title */}
      <Heading size="5" style={{ margin: 0, fontWeight: 600 }}>
        🥖 Recipe Journal
      </Heading>

      {/* Auth Button */}
      <AuthButton />
    </Box>
  );
}
