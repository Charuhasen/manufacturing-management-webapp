import { createClient } from "@/lib/supabase/server";
import { ProductTable } from "./product-table";

interface Product {
  id: string;
  sku: string;
  name: string;
  type: string;
  description: string | null;
  uom: string;
  color: string | null;
  size: string | null;
  parent_raw_material_id: string | null;
  parent_master_batch_id: string | null;
  target_production_per_shift: number | null;
  machine_type: string | null;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

interface ReferenceProduct {
  id: string;
  name: string;
}

export default async function ProductManagerPage() {
  const supabase = await createClient();

  const [productsRes, rawMaterialsRes, masterBatchesRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, sku, name, type, description, uom, color, size, parent_raw_material_id, parent_master_batch_id, target_production_per_shift, machine_type, reorder_level, created_at, updated_at"
      )
      .order("type")
      .order("name"),
    supabase
      .from("products")
      .select("id, name")
      .eq("type", "RAW_MATERIAL")
      .order("name"),
    supabase
      .from("products")
      .select("id, name")
      .eq("type", "MASTER_BATCH")
      .order("name"),
  ]);

  const products = (productsRes.data ?? []) as Product[];
  const rawMaterials = (rawMaterialsRes.data ?? []) as ReferenceProduct[];
  const masterBatches = (masterBatchesRes.data ?? []) as ReferenceProduct[];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Product Manager</h2>
      <ProductTable
        products={products}
        rawMaterials={rawMaterials}
        masterBatches={masterBatches}
      />
    </div>
  );
}
