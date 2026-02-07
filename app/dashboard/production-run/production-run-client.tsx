"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewProductionRunDialog } from "./new-production-run-dialog";
import { ProductionRunDetailDialog } from "./production-run-detail-dialog";
import type {
  ProductionRunReferenceData,
  ProductionRunRow,
} from "@/types/production-run";

interface ProductionRunClientProps {
  referenceData: ProductionRunReferenceData;
  productionRuns: ProductionRunRow[];
}

/** Inline SVG bar chart comparing target vs actual */
function TargetActualChart({
  target,
  actual,
}: {
  target: number;
  actual: number;
}) {
  const max = Math.max(target, actual, 1);
  const targetPct = (target / max) * 100;
  const actualPct = (actual / max) * 100;

  return (
    <svg
      viewBox="0 0 100 40"
      className="h-10 w-full"
      preserveAspectRatio="none"
      aria-label={`Target: ${target}, Actual: ${actual}`}
    >
      {/* Target bar */}
      <rect
        x="0"
        y="2"
        width={targetPct}
        height="16"
        rx="3"
        className="fill-muted-foreground/25"
      />
      {/* Actual bar */}
      <rect
        x="0"
        y="22"
        width={actualPct}
        height="16"
        rx="3"
        className={
          actual >= target ? "fill-green-500/80" : "fill-amber-500/80"
        }
      />
    </svg>
  );
}

function groupByDay(
  runs: ProductionRunRow[]
): { date: string; label: string; runs: ProductionRunRow[] }[] {
  const map = new Map<string, ProductionRunRow[]>();

  for (const run of runs) {
    const dateKey = new Date(run.created_at).toISOString().slice(0, 10);
    const existing = map.get(dateKey);
    if (existing) {
      existing.push(run);
    } else {
      map.set(dateKey, [run]);
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateKey, dayRuns]) => ({
      date: dateKey,
      label: new Date(dateKey + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      runs: dayRuns,
    }));
}

export function ProductionRunClient({
  referenceData,
  productionRuns,
}: ProductionRunClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<ProductionRunRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const grouped = useMemo(() => groupByDay(productionRuns), [productionRuns]);

  function handleCardClick(run: ProductionRunRow) {
    setSelectedRun(run);
    setDetailOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Production Run</h2>
          <p className="mt-1 text-muted-foreground">
            Manage and monitor production runs.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      {grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.date}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {group.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.runs.map((run) => (
                  <Card
                    key={run.id}
                    className="cursor-pointer transition-colors hover:bg-accent/50"
                    onClick={() => handleCardClick(run)}
                  >
                    <CardContent className="flex flex-1 flex-col gap-3">
                      {/* Header: product + shift */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-snug line-clamp-2">
                            {run.product_name}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {run.product_sku}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {run.shift}
                        </Badge>
                      </div>

                      {/* Chart — pushed to bottom */}
                      <div className="mt-auto space-y-2">
                        <TargetActualChart
                          target={run.target_quantity}
                          actual={run.actual_pieces_produced}
                        />

                        {/* Legend */}
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/25" />
                            Target: {run.target_quantity}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-sm ${
                                run.actual_pieces_produced >= run.target_quantity
                                  ? "bg-green-500/80"
                                  : "bg-amber-500/80"
                              }`}
                            />
                            Actual: {run.actual_pieces_produced}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          No production runs found.
        </div>
      )}

      <NewProductionRunDialog
        referenceData={referenceData}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ProductionRunDetailDialog
        run={selectedRun}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
