import { and, asc, eq } from "drizzle-orm";
import { db, yieldPresets } from "@/db";
import type { YieldPreset } from "@/types/recipes";

const createId = () => crypto.randomUUID();

type DbYieldPreset = typeof yieldPresets.$inferSelect;

function toDomain(record: DbYieldPreset): YieldPreset {
  return {
    id: record.id,
    label: record.label,
    unitWeight: record.unitWeight,
    sortOrder: record.sortOrder,
  };
}

export async function listYieldPresets(userId: string): Promise<YieldPreset[]> {
  const rows = await db.query.yieldPresets.findMany({
    where: eq(yieldPresets.userId, userId),
    orderBy: [asc(yieldPresets.sortOrder), asc(yieldPresets.createdAt)],
  });
  return rows.map(toDomain);
}

export async function createYieldPreset(
  userId: string,
  input: { label: string; unitWeight: number },
): Promise<YieldPreset> {
  const existing = await db.query.yieldPresets.findMany({
    where: eq(yieldPresets.userId, userId),
    columns: { sortOrder: true },
  });
  const nextOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  const id = createId();
  await db.insert(yieldPresets).values({
    id,
    userId,
    label: input.label,
    unitWeight: input.unitWeight,
    sortOrder: nextOrder,
  });

  const row = await db.query.yieldPresets.findFirst({
    where: eq(yieldPresets.id, id),
  });
  return toDomain(row!);
}

export async function updateYieldPreset(
  userId: string,
  id: string,
  input: { label?: string; unitWeight?: number },
): Promise<YieldPreset | null> {
  const existing = await db.query.yieldPresets.findFirst({
    where: and(eq(yieldPresets.id, id), eq(yieldPresets.userId, userId)),
  });
  if (!existing) {
    return null;
  }

  const updates: Partial<typeof yieldPresets.$inferInsert> = { updatedAt: new Date() };
  if (input.label !== undefined) updates.label = input.label;
  if (input.unitWeight !== undefined) updates.unitWeight = input.unitWeight;

  await db.update(yieldPresets).set(updates).where(eq(yieldPresets.id, id));

  const row = await db.query.yieldPresets.findFirst({
    where: eq(yieldPresets.id, id),
  });
  return toDomain(row!);
}

export async function deleteYieldPreset(userId: string, id: string): Promise<boolean> {
  const existing = await db.query.yieldPresets.findFirst({
    where: and(eq(yieldPresets.id, id), eq(yieldPresets.userId, userId)),
  });
  if (!existing) {
    return false;
  }
  await db.delete(yieldPresets).where(eq(yieldPresets.id, id));
  return true;
}
