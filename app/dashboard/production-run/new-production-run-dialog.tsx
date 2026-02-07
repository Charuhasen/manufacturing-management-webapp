"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type {
  ProductionRunReferenceData,
  FinishedGoodProduct,
} from "@/types/production-run";

interface NewProductionRunDialogProps {
  referenceData: ProductionRunReferenceData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProductionRunDialog({
  referenceData,
  open,
  onOpenChange,
}: NewProductionRunDialogProps) {
  const router = useRouter();

  const [selectedProduct, setSelectedProduct] =
    useState<FinishedGoodProduct | null>(null);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

  const [machineId, setMachineId] = useState("");
  const [actualPiecesProduced, setActualPiecesProduced] = useState("");
  const [wasteQuantity, setWasteQuantity] = useState("");
  const [rawMaterialId, setRawMaterialId] = useState("");
  const [rawMaterialBagsUsed, setRawMaterialBagsUsed] = useState("");
  const [masterBatchId, setMasterBatchId] = useState("");
  const [masterBatchBagsUsed, setMasterBatchBagsUsed] = useState("");
  const [shift, setShift] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [startedAt, setStartedAt] = useState(today);
  const [completedAt, setCompletedAt] = useState(today);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setSelectedProduct(null);
    setMachineId("");
    setActualPiecesProduced("");
    setWasteQuantity("");
    setRawMaterialId("");
    setRawMaterialBagsUsed("");
    setMasterBatchId("");
    setMasterBatchBagsUsed("");
    setShift("");
    setStartedAt(new Date().toISOString().slice(0, 10));
    setCompletedAt(new Date().toISOString().slice(0, 10));
    setError(null);
    setLoading(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleShiftChange(value: string) {
    setShift(value);
  }

  function handleProductSelect(product: FinishedGoodProduct) {
    setSelectedProduct(product);
    setProductPopoverOpen(false);

    if (product.parent_raw_material_id) {
      setRawMaterialId(product.parent_raw_material_id);
    }
    if (product.parent_master_batch_id) {
      setMasterBatchId(product.parent_master_batch_id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProduct) {
      setError("Please select a product.");
      return;
    }
    if (!machineId) {
      setError("Please select a machine.");
      return;
    }
    if (!actualPiecesProduced || Number(actualPiecesProduced) < 0) {
      setError("Actual pieces produced is required and must be non-negative.");
      return;
    }
    if (!rawMaterialBagsUsed || Number(rawMaterialBagsUsed) < 0) {
      setError(
        "Raw material bags used is required and must be non-negative."
      );
      return;
    }
    if (!masterBatchBagsUsed || Number(masterBatchBagsUsed) < 0) {
      setError(
        "Master batch bags used is required and must be non-negative."
      );
      return;
    }
    if (!shift) {
      setError("Please select a shift.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        product_id: selectedProduct.id,
        machine_id: machineId,
        target_quantity: selectedProduct.target_production_per_shift ?? 0,
        actual_pieces_produced: Number(actualPiecesProduced),
        waste_quantity: wasteQuantity ? Number(wasteQuantity) : 0,
        raw_material_id: rawMaterialId || null,
        raw_material_bags_used: Number(rawMaterialBagsUsed),
        master_batch_id: masterBatchId || null,
        master_batch_bags_used: Number(masterBatchBagsUsed),
        shift,
      };

      if (startedAt) {
        body.started_at = new Date(startedAt).toISOString();
      }
      if (completedAt) {
        body.completed_at = new Date(completedAt).toISOString();
      }

      const res = await fetch("/api/production-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "Failed to create production run.");
        setLoading(false);
        return;
      }

      handleOpenChange(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Production Run</DialogTitle>
          <DialogDescription>
            Record a new production run with material usage details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Product — searchable combobox (full width) */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Product</Label>
              <Popover
                open={productPopoverOpen}
                onOpenChange={setProductPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productPopoverOpen}
                    className="w-full justify-between font-normal"
                    disabled={loading}
                  >
                    {selectedProduct
                      ? `${selectedProduct.sku} — ${selectedProduct.name}`
                      : "Select a product..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No products found.</CommandEmpty>
                      <CommandGroup>
                        {referenceData.finishedGoods.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.sku} ${product.name}`}
                            onSelect={() => handleProductSelect(product)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProduct?.id === product.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="font-mono text-xs mr-2">
                              {product.sku}
                            </span>
                            {product.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Machine */}
            <div className="space-y-2">
              <Label>Machine</Label>
              <Select
                value={machineId}
                onValueChange={setMachineId}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a machine..." />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} ({machine.serial_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Quantity (read-only) */}
            <div className="space-y-2">
              <Label>Target Quantity</Label>
              <Input
                type="number"
                value={selectedProduct?.target_production_per_shift ?? ""}
                readOnly
                disabled
                placeholder="Auto-filled on product selection"
              />
            </div>

            {/* Actual Pieces Produced */}
            <div className="space-y-2">
              <Label htmlFor="actual-pieces">Actual Pieces Produced</Label>
              <Input
                id="actual-pieces"
                type="number"
                min="0"
                value={actualPiecesProduced}
                onChange={(e) => setActualPiecesProduced(e.target.value)}
                disabled={loading}
                placeholder="0"
              />
            </div>

            {/* Waste Quantity */}
            <div className="space-y-2">
              <Label htmlFor="waste-qty">Waste Quantity</Label>
              <Input
                id="waste-qty"
                type="number"
                min="0"
                value={wasteQuantity}
                onChange={(e) => setWasteQuantity(e.target.value)}
                disabled={loading}
                placeholder="0"
              />
            </div>

            {/* Raw Material */}
            <div className="space-y-2">
              <Label>Raw Material</Label>
              <Select
                value={rawMaterialId}
                onValueChange={setRawMaterialId}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select raw material..." />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.rawMaterials.map((rm) => (
                    <SelectItem key={rm.id} value={rm.id}>
                      {rm.sku} — {rm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Raw Material Bags Used */}
            <div className="space-y-2">
              <Label htmlFor="rm-bags">Raw Material Bags Used</Label>
              <Input
                id="rm-bags"
                type="number"
                min="0"
                step="any"
                value={rawMaterialBagsUsed}
                onChange={(e) => setRawMaterialBagsUsed(e.target.value)}
                disabled={loading}
                placeholder="0"
              />
            </div>

            {/* Master Batch */}
            <div className="space-y-2">
              <Label>Master Batch</Label>
              <Select
                value={masterBatchId}
                onValueChange={setMasterBatchId}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select master batch..." />
                </SelectTrigger>
                <SelectContent>
                  {referenceData.masterBatches.map((mb) => (
                    <SelectItem key={mb.id} value={mb.id}>
                      {mb.sku} — {mb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Master Batch Bags Used */}
            <div className="space-y-2">
              <Label htmlFor="mb-bags">Master Batch Bags Used</Label>
              <Input
                id="mb-bags"
                type="number"
                min="0"
                step="any"
                value={masterBatchBagsUsed}
                onChange={(e) => setMasterBatchBagsUsed(e.target.value)}
                disabled={loading}
                placeholder="0"
              />
            </div>

            {/* Shift */}
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={shift} onValueChange={handleShiftChange} disabled={loading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select shift..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY">Day</SelectItem>
                  <SelectItem value="NIGHT">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Started At */}
            <div className="space-y-2">
              <Label htmlFor="started-at">Started At</Label>
              <Input
                id="started-at"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Completed At */}
            <div className="space-y-2">
              <Label htmlFor="completed-at">Completed At</Label>
              <Input
                id="completed-at"
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Production Run"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
