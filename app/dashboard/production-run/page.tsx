import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAdmin } from "@/lib/auth/role";
import { ProductionRunClient } from "./production-run-client";
import type {
  FinishedGoodProduct,
  RawMaterialProduct,
  MasterBatchProduct,
  Machine,
  ProductionRunRow,
} from "@/types/production-run";

export default async function ProductionRunPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  if (!isAdmin(role)) {
    redirect("/dashboard");
  }

  const [
    finishedGoodsRes,
    rawMaterialsRes,
    masterBatchesRes,
    machinesRes,
    productionRunsRes,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, sku, name, parent_raw_material_id, parent_master_batch_id, target_production_per_shift"
      )
      .eq("type", "FINISHED_GOOD")
      .order("name"),
    supabase
      .from("products")
      .select("id, sku, name")
      .eq("type", "RAW_MATERIAL")
      .order("name"),
    supabase
      .from("products")
      .select("id, sku, name")
      .eq("type", "MASTER_BATCH")
      .order("name"),
    supabase
      .from("machines")
      .select("id, name, serial_number")
      .eq("status", "ACTIVE")
      .order("name"),
    supabase
      .from("production_runs")
      .select(
        `id, target_quantity, actual_pieces_produced, waste_quantity,
         raw_material_bags_used, master_batch_bags_used, shift,
         run_date, created_at,
         product:products!production_runs_product_id_fkey ( sku, name ),
         machine:machines!production_runs_machine_id_fkey ( name ),
         raw_material:products!production_runs_raw_material_id_fkey ( name ),
         master_batch:products!production_runs_master_batch_id_fkey ( name ),
         users_profile!production_runs_created_by_fkey ( first_name, last_name )`
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const finishedGoods = (finishedGoodsRes.data ?? []) as FinishedGoodProduct[];
  const rawMaterials = (rawMaterialsRes.data ?? []) as RawMaterialProduct[];
  const masterBatches = (masterBatchesRes.data ?? []) as MasterBatchProduct[];
  const machines = (machinesRes.data ?? []) as Machine[];

  const productionRuns: ProductionRunRow[] = (
    productionRunsRes.data ?? []
  ).map((row: Record<string, unknown>) => {
    const product = row.product as { sku: string; name: string } | null;
    const machine = row.machine as { name: string } | null;
    const rawMat = row.raw_material as { name: string } | null;
    const masterB = row.master_batch as { name: string } | null;
    const profile = row.users_profile as {
      first_name: string;
      last_name: string;
    } | null;

    return {
      id: row.id as string,
      target_quantity: Number(row.target_quantity),
      actual_pieces_produced: Number(row.actual_pieces_produced),
      waste_quantity: Number(row.waste_quantity ?? 0),
      raw_material_bags_used: Number(row.raw_material_bags_used),
      master_batch_bags_used: Number(row.master_batch_bags_used),
      shift: row.shift as string,
      run_date: row.run_date as string,
      created_at: row.created_at as string,
      product_name: product?.name ?? "—",
      product_sku: product?.sku ?? "—",
      machine_name: machine?.name ?? "—",
      raw_material_name: rawMat?.name ?? null,
      master_batch_name: masterB?.name ?? null,
      created_by_name: profile
        ? `${profile.first_name} ${profile.last_name}`
        : null,
    };
  });

  return (
    <div className="space-y-4">
      <ProductionRunClient
        referenceData={{ finishedGoods, rawMaterials, masterBatches, machines }}
        productionRuns={productionRuns}
      />
    </div>
  );
}
