import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_PROCESS_TYPES = [
  "BLOW_MOULDING",
  "INJECTION_MOULDING",
  "EXTRUSION",
  "THERMOFORMING",
] as const;

const VALID_STATUSES = ["ACTIVE", "MAINTENANCE", "RETIRED"] as const;

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
    return json({ success: false, error: "Machine id is required" }, 400);
  }

  const allowedFields = ["name", "serial_number", "process_type", "status"];

  const updateData: Record<string, unknown> = {};

  for (const key of allowedFields) {
    if (key in fields) {
      updateData[key] = fields[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return json({ success: false, error: "No valid fields to update" }, 400);
  }

  // Validate required text fields
  if ("name" in updateData && (!updateData.name || typeof updateData.name !== "string" || !(updateData.name as string).trim())) {
    return json({ success: false, error: "Name is required" }, 400);
  }

  if ("serial_number" in updateData && (!updateData.serial_number || typeof updateData.serial_number !== "string" || !(updateData.serial_number as string).trim())) {
    return json({ success: false, error: "Serial number is required" }, 400);
  }

  // Validate enum fields
  if (
    "process_type" in updateData &&
    !VALID_PROCESS_TYPES.includes(updateData.process_type as (typeof VALID_PROCESS_TYPES)[number])
  ) {
    return json({ success: false, error: "Invalid process type" }, 400);
  }

  if (
    "status" in updateData &&
    !VALID_STATUSES.includes(updateData.status as (typeof VALID_STATUSES)[number])
  ) {
    return json({ success: false, error: "Invalid status" }, 400);
  }

  // Trim text fields
  if ("name" in updateData) updateData.name = (updateData.name as string).trim();
  if ("serial_number" in updateData) updateData.serial_number = (updateData.serial_number as string).trim();

  const { data, error } = await supabase
    .from("machines")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Machine update error:", error);
    return json({ success: false, error: "Failed to update machine" }, 500);
  }

  return json({ success: true, data });
}
