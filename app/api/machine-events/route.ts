import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAdminOrSupervisor } from "@/lib/auth/role";
import { NextRequest, NextResponse } from "next/server";

const VALID_EVENT_TYPES = ["FAULT", "BREAKDOWN", "MAINTENANCE", "STATUS_CHANGE"] as const;
const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

function json(body: { success: boolean; data?: unknown; error?: string }, status = 200) {
  return NextResponse.json(body, { status });
}

// GET — all authenticated users can read events
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get("machine_id");
  const eventType = searchParams.get("event_type");
  const unresolvedOnly = searchParams.get("unresolved") === "true";

  let query = supabase
    .from("machine_events")
    .select(
      `*,
       machines(name, serial_number),
       creator:users_profile!machine_events_created_by_fkey(first_name, last_name),
       resolver:users_profile!machine_events_resolved_by_fkey(first_name, last_name)`
    )
    .order("created_at", { ascending: false });

  if (machineId) {
    query = query.eq("machine_id", machineId);
  }

  if (eventType && VALID_EVENT_TYPES.includes(eventType as (typeof VALID_EVENT_TYPES)[number])) {
    query = query.eq("event_type", eventType);
  }

  if (unresolvedOnly) {
    query = query.is("resolved_at", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Machine events fetch error:", error);
    return json({ success: false, error: "Failed to fetch machine events" }, 500);
  }

  return json({ success: true, data });
}

// POST — admin/supervisor only
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const role = await getUserRole(supabase, user.id);
  if (!isAdminOrSupervisor(role)) {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { machine_id, event_type, severity, description, started_at } = body;

  if (!machine_id || typeof machine_id !== "string") {
    return json({ success: false, error: "machine_id is required" }, 400);
  }

  if (!event_type || !VALID_EVENT_TYPES.includes(event_type as (typeof VALID_EVENT_TYPES)[number])) {
    return json({ success: false, error: "Valid event_type is required" }, 400);
  }

  if (severity && !VALID_SEVERITIES.includes(severity as (typeof VALID_SEVERITIES)[number])) {
    return json({ success: false, error: "Invalid severity level" }, 400);
  }

  if (!description || typeof description !== "string" || !description.trim()) {
    return json({ success: false, error: "description is required" }, 400);
  }

  // Validate machine exists
  const { data: machine, error: machineError } = await supabase
    .from("machines")
    .select("id")
    .eq("id", machine_id)
    .single();

  if (machineError || !machine) {
    return json({ success: false, error: "Machine not found" }, 400);
  }

  const insertData: Record<string, unknown> = {
    machine_id,
    event_type,
    severity: severity || "LOW",
    description: (description as string).trim(),
    created_by: user.id,
  };

  if (started_at && typeof started_at === "string") {
    const parsedDate = new Date(started_at);
    if (isNaN(parsedDate.getTime())) {
      return json({ success: false, error: "Invalid started_at date" }, 400);
    }
    insertData.started_at = started_at;
  }

  const { data, error } = await supabase
    .from("machine_events")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Machine event create error:", error);
    return json({ success: false, error: "Failed to create machine event" }, 500);
  }

  return json({ success: true, data }, 201);
}

// PATCH — admin/supervisor only (update event or resolve it)
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const role = await getUserRole(supabase, user.id);
  if (!isAdminOrSupervisor(role)) {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { id, ...fields } = body;

  if (!id || typeof id !== "string") {
    return json({ success: false, error: "Event id is required" }, 400);
  }

  const allowedFields = [
    "event_type",
    "severity",
    "description",
    "started_at",
    "resolved_at",
    "resolution_notes",
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

  // Validate enum fields if present
  if (
    "event_type" in updateData &&
    !VALID_EVENT_TYPES.includes(updateData.event_type as (typeof VALID_EVENT_TYPES)[number])
  ) {
    return json({ success: false, error: "Invalid event_type" }, 400);
  }

  if (
    "severity" in updateData &&
    !VALID_SEVERITIES.includes(updateData.severity as (typeof VALID_SEVERITIES)[number])
  ) {
    return json({ success: false, error: "Invalid severity" }, 400);
  }

  if (
    "description" in updateData &&
    (!updateData.description || typeof updateData.description !== "string" || !(updateData.description as string).trim())
  ) {
    return json({ success: false, error: "description cannot be empty" }, 400);
  }

  if ("description" in updateData) {
    updateData.description = (updateData.description as string).trim();
  }

  if ("resolution_notes" in updateData && updateData.resolution_notes !== null) {
    if (typeof updateData.resolution_notes !== "string") {
      return json({ success: false, error: "resolution_notes must be a string" }, 400);
    }
    updateData.resolution_notes = (updateData.resolution_notes as string).trim();
  }

  // If resolving, set resolved_by
  if ("resolved_at" in updateData && updateData.resolved_at !== null) {
    const parsedDate = new Date(updateData.resolved_at as string);
    if (isNaN(parsedDate.getTime())) {
      return json({ success: false, error: "Invalid resolved_at date" }, 400);
    }
    updateData.resolved_by = user.id;
  }

  // If un-resolving (setting resolved_at to null), clear resolved_by
  if ("resolved_at" in updateData && updateData.resolved_at === null) {
    updateData.resolved_by = null;
  }

  const { data, error } = await supabase
    .from("machine_events")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Machine event update error:", error);
    return json({ success: false, error: "Failed to update machine event" }, 500);
  }

  return json({ success: true, data });
}

// DELETE — admin/supervisor only
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const role = await getUserRole(supabase, user.id);
  if (!isAdminOrSupervisor(role)) {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return json({ success: false, error: "Event id is required" }, 400);
  }

  const { error } = await supabase
    .from("machine_events")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Machine event delete error:", error);
    return json({ success: false, error: "Failed to delete machine event" }, 500);
  }

  return json({ success: true });
}
