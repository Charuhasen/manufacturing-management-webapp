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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Machine } from "./page";

interface LogEventDialogProps {
  machines: Machine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EVENT_TYPES = [
  {
    value: "FAULT",
    label: "Fault",
    description:
      "A machine malfunction or error that may still allow partial operation. Requires attention but the machine is not completely stopped.",
  },
  {
    value: "BREAKDOWN",
    label: "Breakdown",
    description:
      "The machine has completely stopped functioning and cannot produce. Immediate intervention is required to resume operations.",
  },
  {
    value: "MAINTENANCE",
    label: "Maintenance",
    description:
      "Scheduled or unscheduled maintenance work on the machine. Includes inspections, part replacements, cleaning, or calibration.",
  },
] as const;

const SEVERITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export function LogEventDialog({
  machines,
  open,
  onOpenChange,
}: LogEventDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [machineId, setMachineId] = useState("");
  const [eventType, setEventType] = useState<string>("FAULT");
  const [severity, setSeverity] = useState("LOW");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");

  function resetForm() {
    setMachineId("");
    setEventType("FAULT");
    setSeverity("LOW");
    setDescription("");
    setStartedAt("");
    setCompletedAt("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);

    if (!machineId) {
      setError("Please select a machine.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    if (completedAt && startedAt && new Date(completedAt) < new Date(startedAt)) {
      setError("Completed date cannot be before started date.");
      return;
    }

    setSaving(true);

    try {
      const body: Record<string, string> = {
        machine_id: machineId,
        event_type: eventType,
        severity,
        description: description.trim(),
      };

      if (startedAt) {
        body.started_at = new Date(startedAt).toISOString();
      }

      if (completedAt) {
        body.resolved_at = new Date(completedAt).toISOString();
      }

      const res = await fetch("/api/machine-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to log event.");
        return;
      }

      resetForm();
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  const selectedType = EVENT_TYPES.find((t) => t.value === eventType);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Machine Event</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Event Type Tabs */}
          <div className="space-y-2">
            <Label>Event Type</Label>
            <div className="flex gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setEventType(t.value)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    eventType === t.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {selectedType && (
              <p className="text-xs text-muted-foreground">
                {selectedType.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Machine</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="started-at">Started At (optional)</Label>
              <Input
                id="started-at"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completed-at">Completed At (optional)</Label>
              <Input
                id="completed-at"
                type="datetime-local"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Log Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
