import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface StockAdjustBody {
  product_stock_id: string;
  product_id: string;
  quantity_change: number;
  uom: string;
  notes: string;
}

function json(body: { success: boolean; data?: unknown; error?: string }, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  let body: StockAdjustBody;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { product_stock_id, product_id, quantity_change, uom, notes } = body;

  if (!product_stock_id || !product_id || !uom || !notes) {
    return json({ success: false, error: "Missing required fields" }, 400);
  }

  if (!Number.isFinite(quantity_change) || quantity_change === 0) {
    return json({ success: false, error: "quantity_change must be a non-zero number" }, 400);
  }

  // Insert ledger entry
  const { error: ledgerError } = await supabase.from("stock_ledger").insert({
    product_id,
    quantity_change,
    uom,
    transaction_source_table: "products_stock",
    notes,
    created_by: user.id,
  });

  if (ledgerError) {
    return json({ success: false, error: "Failed to create ledger entry" }, 500);
  }

  // Update stock quantity
  const { error: stockError } = await supabase.rpc("increment_stock", {
    row_id: product_stock_id,
    qty: quantity_change,
  });

  if (stockError) {
    // Fallback: read current quantity and update
    const { data: current, error: readError } = await supabase
      .from("products_stock")
      .select("quantity")
      .eq("id", product_stock_id)
      .single();

    if (readError || !current) {
      return json({ success: false, error: "Failed to read current stock" }, 500);
    }

    const newQuantity = Number(current.quantity) + quantity_change;

    const { error: updateError } = await supabase
      .from("products_stock")
      .update({ quantity: newQuantity })
      .eq("id", product_stock_id);

    if (updateError) {
      return json({ success: false, error: "Failed to update stock quantity" }, 500);
    }
  }

  return json({ success: true });
}
