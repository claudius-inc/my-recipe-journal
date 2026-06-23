import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-utils";
import { deleteYieldPreset, updateYieldPreset } from "@/server/yieldPresetsService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { presetId: string } },
) {
  const { userId, error, status } = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error }, { status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    unitWeight?: number;
  };

  const updates: { label?: string; unitWeight?: number } = {};
  if (body.label !== undefined) {
    const label = body.label.trim();
    if (!label) {
      return NextResponse.json({ error: "Label cannot be empty" }, { status: 400 });
    }
    updates.label = label;
  }
  if (body.unitWeight !== undefined) {
    const unitWeight = Number(body.unitWeight);
    if (!Number.isFinite(unitWeight) || unitWeight <= 0) {
      return NextResponse.json(
        { error: "unitWeight must be a positive number" },
        { status: 400 },
      );
    }
    updates.unitWeight = unitWeight;
  }

  const preset = await updateYieldPreset(userId, params.presetId, updates);
  if (!preset) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  }

  return NextResponse.json({ data: preset });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { presetId: string } },
) {
  const { userId, error, status } = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error }, { status });
  }

  const deleted = await deleteYieldPreset(userId, params.presetId);
  if (!deleted) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { id: params.presetId } });
}
