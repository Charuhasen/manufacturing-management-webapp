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

interface Machine {
  id: string;
  name: string;
  serial_number: string;
  process_type: string;
  status: string;
}

interface EditMachineDialogProps {
  machine: Machine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROCESS_TYPES = [
  { value: "BLOW_MOULDING", label: "Blow Moulding" },
  { value: "INJECTION_MOULDING", label: "Injection Moulding" },
  { value: "EXTRUSION", label: "Extrusion" },
  { value: "THERMOFORMING", label: "Thermoforming" },
];

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RETIRED", label: "Retired" },
];

export function EditMachineDialog({
  machine,
  open,
  onOpenChange,
}: EditMachineDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(machine.name);
  const [serialNumber, setSerialNumber] = useState(machine.serial_number);
  const [processType, setProcessType] = useState(machine.process_type);
  const [status, setStatus] = useState(machine.status);

  async function handleSave() {
    setError(null);

    if (!name.trim() || !serialNumber.trim()) {
      setError("Name and Serial Number are required.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/machines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: machine.id,
          name: name.trim(),
          serial_number: serialNumber.trim(),
          process_type: processType,
          status,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to update machine.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Machine</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Process Type</Label>
              <Select value={processType} onValueChange={setProcessType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESS_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
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
