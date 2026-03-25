"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Box, Button, TextField, Text, Heading } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { Header } from "@/components/layout/Header";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handlePasskeySignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      const { data, error: authError } = await authClient.signIn.passkey();

      if (authError) {
        throw new Error(String(authError.message || "Passkey sign-in failed"));
      }

      if (data) {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error: authError } = await authClient.signIn.magicLink({
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
    <>
      <Header />
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 50px)",
        }}
      >
        <Box
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "2rem",
          }}
        >
          {isEmailSent ? (
            <Box style={{ textAlign: "center" }}>
              <Heading size="5" style={{ marginBottom: "1rem", color: "#4caf50" }}>
                <CheckCircledIcon className="inline mr-2 h-6 w-6" /> Magic link sent!
              </Heading>
              <Text as="div" style={{ color: "#666", fontSize: "14px" }}>
                Check your email at <strong>{email}</strong> for a sign-in link.
              </Text>
              <Button
                onClick={() => {
                  setIsEmailSent(false);
                  setEmail("");
                }}
                style={{ marginTop: "1.5rem" }}
                variant="ghost"
              >
                Try another email
              </Button>
            </Box>
          ) : showMagicLink ? (
            <>
              <Heading size="5" style={{ marginBottom: "1rem" }}>
                Sign in with email
              </Heading>
              <form onSubmit={handleMagicLinkSubmit}>
                <Box style={{ marginBottom: "1.5rem" }}>
                  <Text
                    as="label"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Email
                  </Text>
                  <TextField.Root
                    type="email"
                    name="email"
                    id="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 p-3"
                  />
                </Box>

                {error && (
                  <Text
                    as="div"
                    style={{
                      color: "#f44336",
                      marginBottom: "1rem",
                      fontSize: "14px",
                    }}
                  >
                    {error}
                  </Text>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  style={{ width: "100%" }}
                  size="3"
                >
                  {isLoading ? "Sending..." : "Send Magic Link"}
                </Button>
              </form>
              <Button
                onClick={() => {
                  setShowMagicLink(false);
                  setError("");
                }}
                style={{ width: "100%", marginTop: "0.75rem" }}
                variant="ghost"
                size="2"
              >
                Back to passkey sign-in
              </Button>
            </>
          ) : (
            <>
              <Heading size="5" style={{ marginBottom: "1rem" }}>
                Log in to your account
              </Heading>

              {error && (
                <Text
                  as="div"
                  style={{
                    color: "#f44336",
                    marginBottom: "1rem",
                    fontSize: "14px",
                  }}
                >
                  {error}
                </Text>
              )}

              <Button
                onClick={handlePasskeySignIn}
                disabled={isLoading}
                style={{ width: "100%" }}
                size="3"
              >
                {isLoading ? "Authenticating..." : "Sign in with Passkey"}
              </Button>

              <Box
                style={{
                  textAlign: "center",
                  marginTop: "1.5rem",
                }}
              >
                <Button
                  onClick={() => {
                    setShowMagicLink(true);
                    setError("");
                  }}
                  variant="ghost"
                  size="2"
                >
                  Use email magic link instead
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  );
}
