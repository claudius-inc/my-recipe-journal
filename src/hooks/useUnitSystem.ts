"use client";

import { useSession } from "@/lib/auth-client";
import type { UnitSystem } from "@/types/recipes";

/**
 * The signed-in user's preferred measurement system, defaulting to "original"
 * (leave quantities as authored). Reads from the Better Auth session, which
 * carries preferredUnitSystem via additionalFields.
 */
export function useUnitSystem(): UnitSystem {
  const { data } = useSession();
  const pref = (data?.user as { preferredUnitSystem?: string } | undefined)
    ?.preferredUnitSystem;
  return pref === "metric" || pref === "imperial" ? pref : "original";
}
