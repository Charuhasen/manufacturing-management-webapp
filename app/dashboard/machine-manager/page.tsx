import { createClient } from "@/lib/supabase/server";
import { MachineTable } from "./machine-table";

interface Machine {
  id: string;
  name: string;
  serial_number: string;
  process_type: string;
  status: string;
  created_at: string;
}

export default async function MachineManagerPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("machines")
    .select("id, name, serial_number, process_type, status, created_at")
    .order("name");

  const machines = (data ?? []) as Machine[];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Machine Manager</h2>
      <MachineTable machines={machines} />
    </div>
  );
}
