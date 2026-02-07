"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun } from "lucide-react";
import type { ProductionRunRow } from "@/types/production-run";

interface ProductionRunDetailDialogProps {
  run: ProductionRunRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProductionRunDetailDialog({
  run,
  open,
  onOpenChange,
}: ProductionRunDetailDialogProps) {
  if (!run) return null;

  const pct =
    run.target_quantity > 0
      ? Math.round((run.actual_pieces_produced / run.target_quantity) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{run.product_name}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {run.product_sku}
          </DialogDescription>
        </DialogHeader>

        {/* Target vs Actual bar */}
        <div className="space-y-2">
          <div className="flex items-end justify-between text-sm">
            <span className="text-muted-foreground">
              Target vs Actual
            </span>
            <span className="font-semibold">
              {pct}%
            </span>
          </div>
          <div className="relative h-6 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                pct >= 100
                  ? "bg-green-500"
                  : pct >= 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
              {run.actual_pieces_produced} / {run.target_quantity}
            </div>
          </div>
        </div>

        <div className="space-y-0">
          <DetailRow label="Date" value={new Date(run.created_at).toLocaleDateString()} />
          <DetailRow label="Shift" value={
            <Badge variant="outline" className="gap-1">
              {run.shift === "DAY" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {run.shift}
            </Badge>
          } />
          <DetailRow label="Machine" value={run.machine_name} />
          <DetailRow label="Target Quantity" value={run.target_quantity} />
          <DetailRow label="Actual Produced" value={run.actual_pieces_produced} />
          <DetailRow label="Waste" value={run.waste_quantity} />
          <DetailRow label="Raw Material" value={run.raw_material_name ?? "—"} />
          <DetailRow label="RM Bags Used" value={run.raw_material_bags_used} />
          <DetailRow label="Master Batch" value={run.master_batch_name ?? "—"} />
          <DetailRow label="MB Bags Used" value={run.master_batch_bags_used} />
          <DetailRow label="Started At" value={formatDate(run.started_at)} />
          <DetailRow label="Completed At" value={formatDate(run.completed_at)} />
          <DetailRow label="Created By" value={run.created_by_name ?? "—"} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
