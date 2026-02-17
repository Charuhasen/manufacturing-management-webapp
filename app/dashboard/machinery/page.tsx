import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAdminOrSupervisor } from "@/lib/auth/role";
import { MachineryClient } from "./machinery-client";


export interface Machine {
  id: string;
  name: string;
  serial_number: string;
  process_type: string;
  status: string;
}

export interface MachineEvent {
  id: string;
  machine_id: string;
  event_type: string;
  severity: string;
  description: string;
  started_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_by: string;
  resolved_by: string | null;
  created_at: string;
  machines: { name: string; serial_number: string } | null;
  creator: { first_name: string; last_name: string } | null;
  resolver: { first_name: string; last_name: string } | null;
}

export default async function MachineryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  const canManageEvents = isAdminOrSupervisor(role);

  const { data: machinesData } = await supabase
    .from("machines")
    .select("id, name, serial_number, process_type, status")
    .order("name");

  const machines = (machinesData ?? []) as Machine[];

  const { data: eventsData } = await supabase
    .from("machine_events")
    .select(
      `*,
       machines(name, serial_number),
       creator:users_profile!machine_events_created_by_fkey(first_name, last_name),
       resolver:users_profile!machine_events_resolved_by_fkey(first_name, last_name)`
    )
    .order("created_at", { ascending: false });

  const events = (eventsData ?? []) as MachineEvent[];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Machinery</h2>
      <MachineryClient
        machines={machines}
        events={events}
        canManageEvents={canManageEvents}
      />
    </div>
  );
}
