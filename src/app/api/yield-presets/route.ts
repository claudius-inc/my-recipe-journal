import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-utils";
import { createYieldPreset, listYieldPresets } from "@/server/yieldPresetsService";

export async function GET(request: NextRequest) {
  const { userId, error, status } = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error }, { status });
  }

  const presets = await listYieldPresets(userId);
  return NextResponse.json({ data: presets });
}

export async function POST(request: NextRequest) {
  const { userId, error, status } = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error }, { status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    unitWeight?: number;
  };

  const label = body.label?.trim();
  const unitWeight = Number(body.unitWeight);

  if (!label || !Number.isFinite(unitWeight) || unitWeight <= 0) {
    return NextResponse.json(
      { error: "A label and a positive unitWeight are required" },
      { status: 400 },
    );
  }

  const preset = await createYieldPreset(userId, { label, unitWeight });
  return NextResponse.json({ data: preset }, { status: 201 });
}
