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
  { value: "FAULT", label: "Fault" },
  { value: "BREAKDOWN", label: "Breakdown" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "STATUS_CHANGE", label: "Status Change" },
];

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
  const [eventType, setEventType] = useState("");
  const [severity, setSeverity] = useState("LOW");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState("");

  function resetForm() {
    setMachineId("");
    setEventType("");
    setSeverity("LOW");
    setDescription("");
    setStartedAt("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);

    if (!machineId) {
      setError("Please select a machine.");
      return;
    }
    if (!eventType) {
      setError("Please select an event type.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
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

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Machine Event</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
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

          <div className="space-y-2">
            <Label htmlFor="started-at">Started At (optional)</Label>
            <Input
              id="started-at"
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
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
