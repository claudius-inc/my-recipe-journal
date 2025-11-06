"use client";

import { useState } from "react";
import { client } from "@/lib/auth-client";
import { Box, Button, TextField, Text, Heading } from "@radix-ui/themes";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Send magic link using Better Auth client
      const { data, error: authError } = await client.signIn.magicLink({
        email,
        callbackURL: "/",
      });

      if (authError) {
        throw new Error(authError.message || "Failed to send magic link");
      }

      setIsEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Box
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Heading size="6" style={{ marginBottom: "1rem", textAlign: "center" }}>
          🥖 Recipe Journal
        </Heading>

        {isEmailSent ? (
          <Box style={{ textAlign: "center" }}>
            <Text as="div" style={{ marginBottom: "1rem", color: "#4caf50" }}>
              ✅ Magic link sent!
            </Text>
            <Text as="div" style={{ color: "#666", fontSize: "14px" }}>
              Check your email at <strong>{email}</strong> for a sign-in link.
            </Text>
            <Button
              onClick={() => {
                setIsEmailSent(false);
                setEmail("");
              }}
              style={{ marginTop: "1.5rem" }}
              color="blue"
              variant="soft"
            >
              Try another email
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Box style={{ marginBottom: "1.5rem" }}>
              <Text as="label" style={{ display: "block", marginBottom: "0.5rem" }}>
                Email
              </Text>
              <TextField.Root
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </Box>

            {error && (
              <Text
                as="div"
                style={{ color: "#f44336", marginBottom: "1rem", fontSize: "14px" }}
              >
                {error}
              </Text>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email}
              style={{ width: "100%" }}
              size="3"
              color="blue"
            >
              {isLoading ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
        )}
      </Box>
    </Box>
  );
}
