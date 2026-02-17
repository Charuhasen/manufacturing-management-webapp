"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Machine, MachineEvent } from "./page";
import { LogEventDialog } from "./log-event-dialog";
import { EventDetailDialog } from "./event-detail-dialog";

interface MachineryClientProps {
  machines: Machine[];
  events: MachineEvent[];
  canManageEvents: boolean;
}

const PROCESS_TYPE_LABELS: Record<string, string> = {
  BLOW_MOULDING: "Blow Moulding",
  INJECTION_MOULDING: "Injection Moulding",
  EXTRUSION: "Extrusion",
  THERMOFORMING: "Thermoforming",
};

const MACHINE_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  ACTIVE: "default",
  MAINTENANCE: "secondary",
  RETIRED: "destructive",
};

const MACHINE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  RETIRED: "Retired",
};

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

export function MachineryClient({
  machines,
  events,
  canManageEvents,
}: MachineryClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MachineEvent | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Filters for events tab
  const [filterMachineId, setFilterMachineId] = useState<string>("all");
  const [filterEventType, setFilterEventType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterUnresolved, setFilterUnresolved] = useState(false);

  // Compute active events per machine for overview
  const activeEventsPerMachine = useMemo(() => {
    const map: Record<string, MachineEvent[]> = {};
    for (const event of events) {
      if (!event.resolved_at) {
        if (!map[event.machine_id]) map[event.machine_id] = [];
        map[event.machine_id].push(event);
      }
    }
    return map;
  }, [events]);

  // Latest event per machine
  const latestEventPerMachine = useMemo(() => {
    const map: Record<string, MachineEvent> = {};
    for (const event of events) {
      if (!map[event.machine_id]) {
        map[event.machine_id] = event;
      }
    }
    return map;
  }, [events]);

  // Filtered events for events tab
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterMachineId !== "all" && event.machine_id !== filterMachineId)
        return false;
      if (filterEventType !== "all" && event.event_type !== filterEventType)
        return false;
      if (filterSeverity !== "all" && event.severity !== filterSeverity)
        return false;
      if (filterUnresolved && event.resolved_at) return false;
      return true;
    });
  }, [events, filterMachineId, filterEventType, filterSeverity, filterUnresolved]);

  function handleCardClick(machineId: string) {
    setFilterMachineId(machineId);
    setActiveTab("events");
  }

  function handleEventRowClick(event: MachineEvent) {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events Log</TabsTrigger>
          </TabsList>
          {canManageEvents && activeTab === "events" && (
            <Button onClick={() => setLogDialogOpen(true)}>Log Event</Button>
          )}
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          {machines.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No machines found.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {machines.map((machine) => {
                const activeEvents =
                  activeEventsPerMachine[machine.id] ?? [];
                const latestEvent = latestEventPerMachine[machine.id];

                return (
                  <Card
                    key={machine.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => handleCardClick(machine.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {machine.name}
                        </CardTitle>
                        <Badge
                          variant={
                            MACHINE_STATUS_VARIANTS[machine.status] ??
                            "secondary"
                          }
                        >
                          {MACHINE_STATUS_LABELS[machine.status] ??
                            machine.status}
                        </Badge>
                      </div>
                      <CardDescription className="font-mono text-xs">
                        {machine.serial_number}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        {PROCESS_TYPE_LABELS[machine.process_type] ??
                          machine.process_type}
                      </p>
                      {activeEvents.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {activeEvents.length} active{" "}
                            {activeEvents.length === 1 ? "event" : "events"}
                          </Badge>
                        </div>
                      )}
                      {latestEvent ? (
                        <p className="text-xs text-muted-foreground">
                          Latest:{" "}
                          {EVENT_TYPE_LABELS[latestEvent.event_type] ??
                            latestEvent.event_type}{" "}
                          —{" "}
                          {latestEvent.description.length > 60
                            ? latestEvent.description.slice(0, 60) + "…"
                            : latestEvent.description}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No events recorded
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Machine</Label>
              <Select
                value={filterMachineId}
                onValueChange={setFilterMachineId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Machines</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Event Type
              </Label>
              <Select
                value={filterEventType}
                onValueChange={setFilterEventType}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="FAULT">Fault</SelectItem>
                  <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Severity</Label>
              <Select
                value={filterSeverity}
                onValueChange={setFilterSeverity}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                id="unresolved-toggle"
                checked={filterUnresolved}
                onCheckedChange={setFilterUnresolved}
              />
              <Label htmlFor="unresolved-toggle" className="text-sm">
                Unresolved only
              </Label>
            </div>
          </div>

          {/* Events Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Reported By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEventRowClick(event)}
                    >
                      <TableCell className="font-medium">
                        {event.machines?.name ?? "Unknown"}
                      </TableCell>
                      <TableCell>
                        {EVENT_TYPE_LABELS[event.event_type] ??
                          event.event_type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            SEVERITY_VARIANTS[event.severity] ?? "secondary"
                          }
                        >
                          {SEVERITY_LABELS[event.severity] ?? event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {event.description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(event.started_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {event.resolved_at ? (
                          <Badge variant="outline">Resolved</Badge>
                        ) : (
                          <Badge variant="destructive">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatName(event.creator)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Log Event Dialog */}
      {canManageEvents && (
        <LogEventDialog
          machines={machines}
          open={logDialogOpen}
          onOpenChange={setLogDialogOpen}
        />
      )}

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) setSelectedEvent(null);
          }}
          canManageEvents={canManageEvents}
        />
      )}
    </>
  );
}
