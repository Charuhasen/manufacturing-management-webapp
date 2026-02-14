import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ProductionRunBody {
  product_id: string;
  machine_id: string;
  target_quantity: number;
  actual_pieces_produced: number;
  waste_quantity?: number;
  raw_material_id: string | null;
  raw_material_bags_used: number;
  master_batch_id: string | null;
  master_batch_bags_used: number;
  shift: string;
  run_date?: string;
}

function json(
  body: { success: boolean; data?: unknown; error?: string },
  status = 200
): NextResponse {
  return NextResponse.json(body, { status });
}

const VALID_SHIFTS = ["DAY", "NIGHT"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  let body: ProductionRunBody;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const {
    product_id,
    machine_id,
    target_quantity,
    actual_pieces_produced,
    waste_quantity,
    raw_material_id,
    raw_material_bags_used,
    master_batch_id,
    master_batch_bags_used,
    shift,
    run_date,
  } = body;

  // Validate required fields
  if (!product_id || !machine_id || !shift) {
    return json(
      { success: false, error: "product_id, machine_id, and shift are required" },
      400
    );
  }

  if (!VALID_SHIFTS.includes(shift)) {
    return json(
      { success: false, error: "shift must be DAY or NIGHT" },
      400
    );
  }

  if (
    !Number.isFinite(actual_pieces_produced) ||
    actual_pieces_produced < 0
  ) {
    return json(
      {
        success: false,
        error: "actual_pieces_produced must be a non-negative number",
      },
      400
    );
  }

  if (
    !Number.isFinite(raw_material_bags_used) ||
    raw_material_bags_used < 0
  ) {
    return json(
      {
        success: false,
        error: "raw_material_bags_used must be a non-negative number",
      },
      400
    );
  }

  // master_batch_bags_used validation is deferred until after product lookup,
  // since it's only required when the product has a parent_master_batch_id

  // Validate product is FINISHED_GOOD
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, type, parent_master_batch_id")
    .eq("id", product_id)
    .single();

  if (productError || !product) {
    return json({ success: false, error: "Product not found" }, 400);
  }

  if (product.type !== "FINISHED_GOOD") {
    return json(
      { success: false, error: "Product must be a FINISHED_GOOD type" },
      400
    );
  }

  const productUsesMasterBatch = !!product.parent_master_batch_id;

  if (productUsesMasterBatch) {
    if (
      !Number.isFinite(master_batch_bags_used) ||
      master_batch_bags_used < 0
    ) {
      return json(
        {
          success: false,
          error: "master_batch_bags_used must be a non-negative number",
        },
        400
      );
    }
  }

  // Validate machine is ACTIVE
  const { data: machine, error: machineError } = await supabase
    .from("machines")
    .select("id, status")
    .eq("id", machine_id)
    .single();

  if (machineError || !machine) {
    return json({ success: false, error: "Machine not found" }, 400);
  }

  if (machine.status !== "ACTIVE") {
    return json(
      { success: false, error: "Machine must be in ACTIVE status" },
      400
    );
  }

  // ── Check stock availability before proceeding ─────────────────────

  if (raw_material_id && raw_material_bags_used > 0) {
    const { data: rmStock, error: rmStockErr } = await supabase
      .from("products_stock")
      .select("quantity")
      .eq("product_id", raw_material_id)
      .single();

    if (rmStockErr || !rmStock) {
      return json(
        { success: false, error: "Raw material stock record not found" },
        400
      );
    }

    if (Number(rmStock.quantity) < raw_material_bags_used) {
      return json(
        {
          success: false,
          error: `Insufficient raw material stock. Available: ${Number(rmStock.quantity)} bags, required: ${raw_material_bags_used} bags.`,
        },
        400
      );
    }
  }

  if (master_batch_id && master_batch_bags_used > 0) {
    const { data: mbStock, error: mbStockErr } = await supabase
      .from("products_stock")
      .select("quantity")
      .eq("product_id", master_batch_id)
      .single();

    if (mbStockErr || !mbStock) {
      return json(
        { success: false, error: "Master batch stock record not found" },
        400
      );
    }

    if (Number(mbStock.quantity) < master_batch_bags_used) {
      return json(
        {
          success: false,
          error: `Insufficient master batch stock. Available: ${Number(mbStock.quantity)} bags, required: ${master_batch_bags_used} bags.`,
        },
        400
      );
    }
  }

  // Build insert payload
  const insertData: Record<string, unknown> = {
    product_id,
    machine_id,
    target_quantity: Number.isFinite(target_quantity) ? target_quantity : 0,
    actual_pieces_produced,
    waste_quantity:
      waste_quantity && Number.isFinite(waste_quantity) ? waste_quantity : 0,
    raw_material_id: raw_material_id || null,
    raw_material_bags_used,
    master_batch_id: productUsesMasterBatch ? (master_batch_id || null) : null,
    master_batch_bags_used: productUsesMasterBatch ? master_batch_bags_used : 0,
    shift,
    created_by: user.id,
  };

  if (run_date) {
    insertData.run_date = run_date;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("production_runs")
    .insert(insertData)
    .select("id")
    .single();

  if (insertError) {
    return json(
      { success: false, error: "Failed to create production run" },
      500
    );
  }

  const productionRunId = inserted.id as string;

  // ── Stock ledger entries & products_stock updates ──────────────────

  // Helper: update products_stock quantity for a given product
  async function updateProductStock(
    productId: string,
    quantityChange: number
  ): Promise<string | null> {
    const { data: stockRow, error: readErr } = await supabase
      .from("products_stock")
      .select("id, quantity")
      .eq("product_id", productId)
      .single();

    if (readErr || !stockRow) {
      return `Failed to read stock for product ${productId}`;
    }

    const newQty = Number(stockRow.quantity) + quantityChange;

    const { error: updateErr } = await supabase
      .from("products_stock")
      .update({ quantity: newQty })
      .eq("id", stockRow.id);

    if (updateErr) {
      return `Failed to update stock for product ${productId}`;
    }

    return null;
  }

  // 1. Finished good: +actual_pieces_produced (pcs)
  if (actual_pieces_produced > 0) {
    const { error: fgLedgerErr } = await supabase
      .from("stock_ledger")
      .insert({
        product_id,
        quantity_change: actual_pieces_produced,
        uom: "pcs",
        transaction_source_table: "production_runs",
        transaction_id: productionRunId,
        notes: `Production run: +${actual_pieces_produced} pcs produced`,
        created_by: user.id,
      });

    if (fgLedgerErr) {
      return json(
        { success: false, error: "Failed to create finished good ledger entry" },
        500
      );
    }

    const fgStockErr = await updateProductStock(product_id, actual_pieces_produced);
    if (fgStockErr) {
      return json({ success: false, error: fgStockErr }, 500);
    }
  }

  // 2. Raw material: -raw_material_bags_used (bags)
  if (raw_material_id && raw_material_bags_used > 0) {
    const { error: rmLedgerErr } = await supabase
      .from("stock_ledger")
      .insert({
        product_id: raw_material_id,
        quantity_change: -raw_material_bags_used,
        uom: "bags",
        transaction_source_table: "production_runs",
        transaction_id: productionRunId,
        notes: `Production run: -${raw_material_bags_used} bags consumed`,
        created_by: user.id,
      });

    if (rmLedgerErr) {
      return json(
        { success: false, error: "Failed to create raw material ledger entry" },
        500
      );
    }

    const rmStockErr = await updateProductStock(raw_material_id, -raw_material_bags_used);
    if (rmStockErr) {
      return json({ success: false, error: rmStockErr }, 500);
    }
  }

  // 3. Master batch: -master_batch_bags_used (bags)
  if (master_batch_id && master_batch_bags_used > 0) {
    const { error: mbLedgerErr } = await supabase
      .from("stock_ledger")
      .insert({
        product_id: master_batch_id,
        quantity_change: -master_batch_bags_used,
        uom: "bags",
        transaction_source_table: "production_runs",
        transaction_id: productionRunId,
        notes: `Production run: -${master_batch_bags_used} bags consumed`,
        created_by: user.id,
      });

    if (mbLedgerErr) {
      return json(
        { success: false, error: "Failed to create master batch ledger entry" },
        500
      );
    }

    const mbStockErr = await updateProductStock(master_batch_id, -master_batch_bags_used);
    if (mbStockErr) {
      return json({ success: false, error: mbStockErr }, 500);
    }
  }

  return json({ success: true, data: { id: productionRunId } }, 201);
}
