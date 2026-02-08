import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_PRODUCT_TYPES = [
  "RAW_MATERIAL",
  "FINISHED_GOOD",
  "MASTER_BATCH",
  "REGRIND_MATERIAL",
] as const;

const VALID_UOMS = ["pcs", "bags"] as const;

function json(body: { success: boolean; data?: unknown; error?: string }, status = 200) {
  return NextResponse.json(body, { status });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { id, ...fields } = body;

  if (!id || typeof id !== "string") {
    return json({ success: false, error: "Product id is required" }, 400);
  }

  const allowedFields = [
    "sku",
    "name",
    "type",
    "description",
    "uom",
    "color",
    "size",
    "parent_raw_material_id",
    "parent_master_batch_id",
    "target_production_per_shift",
    "machine_type",
    "reorder_level",
  ];

  const updateData: Record<string, unknown> = {};

  for (const key of allowedFields) {
    if (key in fields) {
      updateData[key] = fields[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return json({ success: false, error: "No valid fields to update" }, 400);
  }

  // Validate enum fields
  if (
    "type" in updateData &&
    !VALID_PRODUCT_TYPES.includes(updateData.type as (typeof VALID_PRODUCT_TYPES)[number])
  ) {
    return json({ success: false, error: "Invalid product type" }, 400);
  }

  if (
    "uom" in updateData &&
    !VALID_UOMS.includes(updateData.uom as (typeof VALID_UOMS)[number])
  ) {
    return json({ success: false, error: "Invalid unit of measure" }, 400);
  }

  // Validate numeric fields
  if ("reorder_level" in updateData) {
    const val = Number(updateData.reorder_level);
    if (isNaN(val) || val < 0) {
      return json({ success: false, error: "Reorder level must be a non-negative number" }, 400);
    }
    updateData.reorder_level = val;
  }

  if ("target_production_per_shift" in updateData) {
    const raw = updateData.target_production_per_shift;
    if (raw === null || raw === "") {
      updateData.target_production_per_shift = null;
    } else {
      const val = Number(raw);
      if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
        return json(
          { success: false, error: "Target production per shift must be a non-negative integer" },
          400
        );
      }
      updateData.target_production_per_shift = val;
    }
  }

  // Normalize nullable text fields
  for (const field of ["description", "color", "size", "machine_type"]) {
    if (field in updateData && updateData[field] === "") {
      updateData[field] = null;
    }
  }

  // Normalize nullable UUID fields
  for (const field of ["parent_raw_material_id", "parent_master_batch_id"]) {
    if (field in updateData && (updateData[field] === "" || updateData[field] === "none")) {
      updateData[field] = null;
    }
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Product update error:", error);
    return json({ success: false, error: "Failed to update product" }, 500);
  }

  return json({ success: true, data });
}
