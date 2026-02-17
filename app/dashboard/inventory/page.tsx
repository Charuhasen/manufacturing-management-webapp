import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAdmin } from "@/lib/auth/role";
import { StockTypeFilter } from "./stock-type-filter";
import { InventoryTable } from "./inventory-table";
import { ReorderAlerts } from "./reorder-alerts";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type, q } = await searchParams;
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

  let query = supabase
    .from("products_stock")
    .select("id, quantity, uom, products!inner ( id, sku, name, type, color )")
    .order("name", { ascending: true, referencedTable: "products" });

  const activeType = type ?? "FINISHED_GOOD";
  query = query.eq("products.type", activeType);

  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`, {
      referencedTable: "products",
    });
  }

  // Fetch re-order alerts: raw materials & master batches where stock <= reorder_level
  const reorderQuery = supabase
    .from("products_stock")
    .select(
      "quantity, uom, products!inner ( sku, name, type, reorder_level )"
    )
    .in("products.type", ["RAW_MATERIAL", "MASTER_BATCH"])
    .order("name", { ascending: true, referencedTable: "products" });

  const [stockRes, reorderRes] = await Promise.all([query, reorderQuery]);

  const productsStock = (stockRes.data ?? [])
    .map((row) => {
      const product = Array.isArray(row.products)
        ? row.products[0]
        : row.products;
      return {
        id: row.id as string,
        quantity: Number(row.quantity),
        uom: row.uom as string,
        products: {
          id: product.id as string,
          sku: product.sku as string,
          name: product.name as string,
          type: product.type as string,
          color: (product.color as string) ?? null,
        },
      };
    })
    .sort((a, b) => a.products.name.localeCompare(b.products.name));

  const reorderItems = (reorderRes.data ?? [])
    .map((row) => {
      const product = Array.isArray(row.products)
        ? row.products[0]
        : row.products;
      return {
        productName: product.name as string,
        productSku: product.sku as string,
        productType: product.type as string,
        quantity: Number(row.quantity),
        reorderLevel: Number(product.reorder_level),
        uom: row.uom as string,
      };
    })
    .filter((item) => item.quantity <= item.reorderLevel)
    .sort((a, b) => a.quantity - b.quantity);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Inventory</h2>
        <ReorderAlerts items={reorderItems} />
      </div>

      <StockTypeFilter />

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Current Stock</h3>
        <InventoryTable productsStock={productsStock} productType={activeType} />
      </div>
    </div>
  );
}
