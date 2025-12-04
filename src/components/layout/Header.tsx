"use client";

import { Box, Heading, IconButton, Tooltip } from "@radix-ui/themes";
import { AuthButton } from "../AuthButton";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <Box
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        right: 0,
        height: "50px",
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
    >
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Button - Mobile Only */}
        {onMenuClick && (
          <IconButton
            variant="ghost"
            size="2"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open recipes menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </IconButton>
        )}

        {/* Logo/Title */}
        <Heading size="4" style={{ margin: 0, fontWeight: 600 }}>
          My Recipe Journal
        </Heading>
      </div>

      {/* Auth Button */}
      <AuthButton />
    </Box>
  );
}
