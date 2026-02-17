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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MachineEvent } from "./page";

interface EventDetailDialogProps {
  event: MachineEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageEvents: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  FAULT: "Fault",
  BREAKDOWN: "Breakdown",
  MAINTENANCE: "Maintenance",
  STATUS_CHANGE: "Status Change",
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const SEVERITY_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "default",
  CRITICAL: "destructive",
};

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

function formatName(
  profile: { first_name: string; last_name: string } | null
): string {
  if (!profile) return "—";
  return `${profile.first_name} ${profile.last_name}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  canManageEvents,
}: EventDetailDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "resolve">("view");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit fields
  const [eventType, setEventType] = useState(event.event_type);
  const [severity, setSeverity] = useState(event.severity);
  const [description, setDescription] = useState(event.description);

  // Resolve fields
  const [resolutionNotes, setResolutionNotes] = useState(
    event.resolution_notes ?? ""
  );

  function resetState() {
    setMode("view");
    setError(null);
    setEventType(event.event_type);
    setSeverity(event.severity);
    setDescription(event.description);
    setResolutionNotes(event.resolution_notes ?? "");
  }

  async function handleSave() {
    setError(null);

    if (!description.trim()) {
      setError("Description cannot be empty.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/machine-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          event_type: eventType,
          severity,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to update event.");
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

  async function handleResolve() {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/machine-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to resolve event.");
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

  async function handleDelete() {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/machine-events?id=${event.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to delete event.");
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

  // View mode
  if (mode === "view") {
    return (
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen);
          if (!isOpen) resetState();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Machine</span>
              <span className="font-medium">
                {event.machines?.name ?? "Unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>
                {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Severity</span>
              <Badge
                variant={SEVERITY_VARIANTS[event.severity] ?? "secondary"}
              >
                {SEVERITY_LABELS[event.severity] ?? event.severity}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Description</span>
              <p className="mt-1">{event.description}</p>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started</span>
              <span>{formatDate(event.started_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reported By</span>
              <span>{formatName(event.creator)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              {event.resolved_at ? (
                <Badge variant="outline">Resolved</Badge>
              ) : (
                <Badge variant="destructive">Open</Badge>
              )}
            </div>
            {event.resolved_at && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved At</span>
                  <span>{formatDate(event.resolved_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved By</span>
                  <span>{formatName(event.resolver)}</span>
                </div>
                {event.resolution_notes && (
                  <div>
                    <span className="text-muted-foreground">
                      Resolution Notes
                    </span>
                    <p className="mt-1">{event.resolution_notes}</p>
                  </div>
                )}
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {canManageEvents && (
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {!event.resolved_at && (
                <Button
                  variant="default"
                  onClick={() => setMode("resolve")}
                >
                  Resolve
                </Button>
              )}
              <Button variant="outline" onClick={() => setMode("edit")}>
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Edit mode
  if (mode === "edit") {
    return (
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen);
          if (!isOpen) resetState();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
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
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => resetState()}
              disabled={saving}
            >
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

  // Resolve mode
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Event</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Resolving:{" "}
            <span className="font-medium text-foreground">
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </span>{" "}
            on{" "}
            <span className="font-medium text-foreground">
              {event.machines?.name ?? "Unknown"}
            </span>
          </p>

          <div className="space-y-2">
            <Label htmlFor="resolution-notes">
              Resolution Notes (optional)
            </Label>
            <Textarea
              id="resolution-notes"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe how the issue was resolved..."
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => resetState()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={saving}>
            {saving ? "Resolving..." : "Mark Resolved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
