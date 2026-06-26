"use client";

import { useState } from "react";
import Link from "next/link";
import { Heading, Text, SegmentedControl, Card, Flex, Spinner } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { authClient, useSession } from "@/lib/auth-client";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { useToast } from "@/context/ToastContext";
import type { UnitSystem } from "@/types/recipes";

const UNIT_OPTIONS: Array<{ value: UnitSystem; label: string; hint: string }> = [
  { value: "original", label: "Original", hint: "Keep recipes exactly as written" },
  { value: "metric", label: "Metric", hint: "Grams, millilitres, °C" },
  { value: "imperial", label: "Imperial", hint: "Ounces, cups, °F" },
];

export default function SettingsPage() {
  const current = useUnitSystem();
  const { refetch } = useSession();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleChange = async (value: string) => {
    const next = value as UnitSystem;
    setSaving(true);
    try {
      await authClient.updateUser({ preferredUnitSystem: next });
      await refetch?.();
      addToast("Measurement preference saved", "success");
    } catch {
      addToast("Failed to save preference", "error");
    } finally {
      setSaving(false);
    }
  };

  const activeHint = UNIT_OPTIONS.find((o) => o.value === current)?.hint;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeftIcon /> Back to recipes
      </Link>

      <Heading size="6" mb="1">
        Settings
      </Heading>
      <Text size="2" color="gray">
        Preferences for how recipes are imported and displayed.
      </Text>

      <Card mt="5">
        <Flex direction="column" gap="3">
          <div>
            <Text as="div" size="3" weight="medium">
              Measurement system
            </Text>
            <Text as="div" size="2" color="gray">
              Recipes are shown in this system across the app — ingredient amounts and
              temperatures are converted for display, and it&rsquo;s the default for
              imports. Choose &ldquo;Original&rdquo; to keep source units unchanged. Saved
              data is never altered.
            </Text>
          </div>

          <Flex align="center" gap="3">
            <SegmentedControl.Root
              value={current}
              onValueChange={handleChange}
              disabled={saving}
            >
              {UNIT_OPTIONS.map((opt) => (
                <SegmentedControl.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
            {saving && <Spinner size="1" />}
          </Flex>

          {activeHint && (
            <Text size="2" color="gray">
              {activeHint}.
            </Text>
          )}
        </Flex>
      </Card>
    </div>
  );
}
