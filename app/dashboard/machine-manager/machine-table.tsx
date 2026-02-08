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
import { EditMachineDialog } from "./edit-machine-dialog";

interface Machine {
  id: string;
  name: string;
  serial_number: string;
  process_type: string;
  status: string;
  created_at: string;
}

interface MachineTableProps {
  machines: Machine[];
}

const PROCESS_TYPE_LABELS: Record<string, string> = {
  BLOW_MOULDING: "Blow Moulding",
  INJECTION_MOULDING: "Injection Moulding",
  EXTRUSION: "Extrusion",
  THERMOFORMING: "Thermoforming",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  MAINTENANCE: "secondary",
  RETIRED: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  RETIRED: "Retired",
};

export function MachineTable({ machines }: MachineTableProps) {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleRowClick(machine: Machine) {
    setSelectedMachine(machine);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Process Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No machines found.
                </TableCell>
              </TableRow>
            ) : (
              machines.map((machine) => (
                <TableRow
                  key={machine.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(machine)}
                >
                  <TableCell className="font-medium">{machine.name}</TableCell>
                  <TableCell className="font-mono text-sm">{machine.serial_number}</TableCell>
                  <TableCell>
                    {PROCESS_TYPE_LABELS[machine.process_type] ?? machine.process_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[machine.status] ?? "secondary"}>
                      {STATUS_LABELS[machine.status] ?? machine.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(machine.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedMachine && (
        <EditMachineDialog
          machine={selectedMachine}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedMachine(null);
          }}
        />
      )}
    </>
  );
}
