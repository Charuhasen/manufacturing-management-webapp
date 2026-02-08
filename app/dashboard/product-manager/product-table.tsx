"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EditProductDialog } from "./edit-product-dialog";

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

interface ProductTableProps {
  products: Product[];
  rawMaterials: ReferenceProduct[];
  masterBatches: ReferenceProduct[];
}

const TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  FINISHED_GOOD: "Finished Good",
  MASTER_BATCH: "Master Batch",
  REGRIND_MATERIAL: "Regrind Material",
};

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  RAW_MATERIAL: "secondary",
  FINISHED_GOOD: "default",
  MASTER_BATCH: "outline",
  REGRIND_MATERIAL: "destructive",
};

export function ProductTable({
  products,
  rawMaterials,
  masterBatches,
}: ProductTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleRowClick(product: Product) {
    setSelectedProduct(product);
    setDialogOpen(true);
  }

  const rawMaterialMap = new Map(rawMaterials.map((rm) => [rm.id, rm.name]));
  const masterBatchMap = new Map(masterBatches.map((mb) => [mb.id, mb.name]));

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Parent Raw Material</TableHead>
              <TableHead>Parent Master Batch</TableHead>
              <TableHead className="text-right">Target / Shift</TableHead>
              <TableHead>Machine Type</TableHead>
              <TableHead className="text-right">Reorder Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(product)}
                >
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant={TYPE_VARIANTS[product.type] ?? "secondary"}>
                      {TYPE_LABELS[product.type] ?? product.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.uom}</TableCell>
                  <TableCell>{product.color ?? "—"}</TableCell>
                  <TableCell>{product.size ?? "—"}</TableCell>
                  <TableCell>
                    {product.parent_raw_material_id
                      ? rawMaterialMap.get(product.parent_raw_material_id) ?? "—"
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {product.parent_master_batch_id
                      ? masterBatchMap.get(product.parent_master_batch_id) ?? "—"
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.target_production_per_shift?.toLocaleString() ?? "—"}
                  </TableCell>
                  <TableCell>{product.machine_type ?? "—"}</TableCell>
                  <TableCell className="text-right">{product.reorder_level}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedProduct && (
        <EditProductDialog
          product={selectedProduct}
          rawMaterials={rawMaterials}
          masterBatches={masterBatches}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedProduct(null);
          }}
        />
      )}
    </>
  );
}
