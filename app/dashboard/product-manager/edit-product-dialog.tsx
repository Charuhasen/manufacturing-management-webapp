"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

interface ReferenceProduct {
  id: string;
  name: string;
}

interface EditProductDialogProps {
  product: Product;
  rawMaterials: ReferenceProduct[];
  masterBatches: ReferenceProduct[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRODUCT_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "MASTER_BATCH", label: "Master Batch" },
  { value: "REGRIND_MATERIAL", label: "Regrind Material" },
];

const UOMS = [
  { value: "pcs", label: "Pieces" },
  { value: "bags", label: "Bags" },
];

export function EditProductDialog({
  product,
  rawMaterials,
  masterBatches,
  open,
  onOpenChange,
}: EditProductDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState(product.sku);
  const [name, setName] = useState(product.name);
  const [type, setType] = useState(product.type);
  const [description, setDescription] = useState(product.description ?? "");
  const [uom, setUom] = useState(product.uom);
  const [color, setColor] = useState(product.color ?? "");
  const [size, setSize] = useState(product.size ?? "");
  const [parentRawMaterialId, setParentRawMaterialId] = useState(
    product.parent_raw_material_id ?? "none"
  );
  const [parentMasterBatchId, setParentMasterBatchId] = useState(
    product.parent_master_batch_id ?? "none"
  );
  const [targetProductionPerShift, setTargetProductionPerShift] = useState(
    product.target_production_per_shift?.toString() ?? ""
  );
  const [machineType, setMachineType] = useState(product.machine_type ?? "");
  const [reorderLevel, setReorderLevel] = useState(
    product.reorder_level.toString()
  );

  async function handleSave() {
    setError(null);

    if (!sku.trim() || !name.trim()) {
      setError("SKU and Name are required.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          sku: sku.trim(),
          name: name.trim(),
          type,
          description: description.trim(),
          uom,
          color: color.trim(),
          size: size.trim(),
          parent_raw_material_id: parentRawMaterialId,
          parent_master_batch_id: parentMasterBatchId,
          target_production_per_shift:
            targetProductionPerShift.trim() === ""
              ? null
              : Number(targetProductionPerShift),
          machine_type: machineType.trim(),
          reorder_level: Number(reorderLevel),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to update product.");
        return;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Select value={uom} onValueChange={setUom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOMS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Parent Raw Material</Label>
              <Select value={parentRawMaterialId} onValueChange={setParentRawMaterialId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {rawMaterials.map((rm) => (
                    <SelectItem key={rm.id} value={rm.id}>
                      {rm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent Master Batch</Label>
              <Select value={parentMasterBatchId} onValueChange={setParentMasterBatchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {masterBatches.map((mb) => (
                    <SelectItem key={mb.id} value={mb.id}>
                      {mb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target / Shift</Label>
              <Input
                id="target"
                type="number"
                min="0"
                value={targetProductionPerShift}
                onChange={(e) => setTargetProductionPerShift(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machineType">Machine Type</Label>
              <Input
                id="machineType"
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder Level</Label>
              <Input
                id="reorderLevel"
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
