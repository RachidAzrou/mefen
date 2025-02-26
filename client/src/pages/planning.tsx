import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Calendar, Search, X, Clock, Plus, Settings2 } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import React from 'react';
import { db } from "@/lib/firebase";
import { ref, onValue, remove, update, push } from "firebase/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlanningForm } from "@/components/planning/planning-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const planningSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht").optional(),
  roomId: z.string().min(1, "Ruimte is verplicht").optional(),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  isBulkPlanning: z.boolean().default(false),
  selectedVolunteers: z.array(z.string()).default([]),
  selectedRooms: z.array(z.string()).default([])
});

interface Planning {
  id: string;
  volunteerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
}

const PlanningTable = ({
  plannings,
  emptyMessage,
  volunteers,
  rooms,
  onEdit,
  onDelete,
  searchValue,
  onSearchChange,
  showActions = false,
}: {
  plannings: Planning[];
  emptyMessage: string;
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
  onEdit: (planning: Planning) => void;
  onDelete: (id: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  showActions?: boolean;
}) => {
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const filteredPlannings = plannings.filter(planning => {
    // Only filter if there's a search term or date filter
    if (!searchValue && !dateFilter) return true;

    const matchesSearch = searchValue.toLowerCase() === '' || (() => {
      const volunteer = volunteers.find(v => v.id === planning.volunteerId);
      const room = rooms.find(r => r.id === planning.roomId);
      const volunteerName = volunteer ? `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase() : '';
      const roomName = room ? room.name.toLowerCase() : '';
      return volunteerName.includes(searchValue.toLowerCase()) || 
             roomName.includes(searchValue.toLowerCase());
    })();

    const matchesDate = !dateFilter || (() => {
      const planningStart = parseISO(planning.startDate);
      const planningEnd = parseISO(planning.endDate);
      return isWithinInterval(dateFilter, { start: planningStart, end: planningEnd });
    })();

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-4" onClick={stopPropagation}>
      {showActions && (
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Zoek op vrijwilliger of ruimte..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                {dateFilter ? format(dateFilter, 'd MMM yyyy', { locale: nl }) : 'Filter op datum'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
                locale={nl}
              />
            </PopoverContent>
          </Popover>
          {dateFilter && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDateFilter(undefined)}
              className="px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vrijwilliger</TableHead>
              <TableHead>Ruimte</TableHead>
              <TableHead>Periode</TableHead>
              {showActions && <TableHead className="w-[100px]">Acties</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlannings.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showActions ? 4 : 3}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filteredPlannings.map((planning) => {
                const volunteer = volunteers.find(
                  (v) => v.id === planning.volunteerId
                );
                const room = rooms.find((r) => r.id === planning.roomId);

                return (
                  <TableRow key={planning.id}>
                    <TableCell className="font-medium">
                      {volunteer
                        ? `${volunteer.firstName} ${volunteer.lastName}`
                        : "-"}
                    </TableCell>
                    <TableCell>{room ? room.name : "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="whitespace-nowrap">
                          {format(parseISO(planning.startDate), "EEEE d MMM yyyy", {
                            locale: nl,
                          })}
                        </div>
                        <div className="whitespace-nowrap text-muted-foreground">
                          {format(parseISO(planning.endDate), "EEEE d MMM yyyy", {
                            locale: nl,
                          })}
                        </div>
                      </div>
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(planning)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onDelete(planning.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const PlanningSection = ({ title, icon, defaultOpen, children }: {
  title: string;
  icon: React.ReactNode;
  defaultOpen: boolean;
  children: React.ReactNode;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="relative">
      <CollapsibleSection
        title={title}
        icon={icon}
        defaultOpen={defaultOpen}
        titleClassName="text-[#963E56]"
        action={
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
            }}
            className={cn(
              "h-8 w-8",
              isEditing && "text-primary bg-primary/10"
            )}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        }
      >
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement, {
              showActions: isEditing
            });
          }
          return child;
        })}
      </CollapsibleSection>
    </div>
  );
};

const Planning = () => {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<{ id: string; firstName: string; lastName: string; }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string; }[]>([]);
  const [searchActive, setSearchActive] = useState("");
  const [searchUpcoming, setSearchUpcoming] = useState("");
  const [searchPast, setSearchPast] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<Planning | null>(null);
  const { isAdmin } = useRole();

  const form = useForm<z.infer<typeof planningSchema>>({
    resolver: zodResolver(planningSchema),
    defaultValues: {
      isBulkPlanning: false,
      selectedVolunteers: [],
      selectedRooms: [],
    }
  });

  useEffect(() => {
    const planningsRef = ref(db, "plannings");
    const volunteersRef = ref(db, "volunteers");
    const roomsRef = ref(db, "rooms");

    const unsubPlannings = onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data).map(([id, planning]: [string, any]) => ({ id, ...planning })) : [];
      setPlannings(planningsList);
    });

    const unsubVolunteers = onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]: [string, any]) => ({ id, ...volunteer })) : [];
      setVolunteers(volunteersList);
    });

    const unsubRooms = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]: [string, any]) => ({ id, ...room })) : [];
      setRooms(roomsList);
    });

    return () => {
      unsubPlannings();
      unsubVolunteers();
      unsubRooms();
    };
  }, []);

  const handleEdit = (planning: Planning) => {
    setEditingPlanning(planning);
    form.reset({
      volunteerId: planning.volunteerId,
      roomId: planning.roomId,
      startDate: planning.startDate,
      endDate: planning.endDate,
      isBulkPlanning: false,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(db, `plannings/${id}`));
    } catch (error) {
      console.error("Error deleting planning:", error);
    }
  };

  const onSubmit = async (data: z.infer<typeof planningSchema>) => {
    try {
      if (editingPlanning) {
        // Update existing planning
        await update(ref(db, `plannings/${editingPlanning.id}`), {
          volunteerId: data.volunteerId,
          roomId: data.roomId,
          startDate: data.startDate,
          endDate: data.endDate,
        });
      } else {
        // Create new plannings
        if (data.isBulkPlanning) {
          const volunteers = data.selectedVolunteers || [];
          const rooms = data.selectedRooms || [];

          for (const volunteerId of volunteers) {
            for (const roomId of rooms) {
              await push(ref(db, "plannings"), {
                volunteerId,
                roomId,
                startDate: data.startDate,
                endDate: data.endDate,
              });
            }
          }
        } else {
          await push(ref(db, "plannings"), {
            volunteerId: data.volunteerId,
            roomId: data.roomId,
            startDate: data.startDate,
            endDate: data.endDate,
          });
        }
      }

      setDialogOpen(false);
      setEditingPlanning(null);
      form.reset();
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activePlannings = plannings.filter((planning) => {
    const start = parseISO(planning.startDate);
    const end = parseISO(planning.endDate);
    return start <= now && end >= now;
  });

  const upcomingPlannings = plannings.filter((planning) => {
    const start = parseISO(planning.startDate);
    return start > now;
  });

  const pastPlannings = plannings.filter((planning) => {
    const end = parseISO(planning.endDate);
    return end < now;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Planning</h1>
      </div>

      <CollapsibleSection
        title="Planning Overzicht"
        icon={<Calendar className="h-5 w-5" />}
        defaultOpen={true}
        titleClassName="text-[#963E56]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="bg-primary/10 rounded-full p-2 mr-3">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Actieve Planningen</div>
                  <div className="text-2xl font-bold">{activePlannings.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="bg-primary/10 rounded-full p-2 mr-3">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Toekomstige Planningen</div>
                  <div className="text-2xl font-bold">{upcomingPlannings.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="bg-primary/10 rounded-full p-2 mr-3">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">Afgelopen Planningen</div>
                  <div className="text-2xl font-bold">{pastPlannings.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isAdmin && (
          <div className="mt-6 flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[#6BB85C] hover:bg-[#6BB85C]/90">
                  <Plus className="h-4 w-4" />
                  Inplannen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[500px] p-6">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold">
                    {editingPlanning ? "Planning Bewerken" : "Planning"}
                  </DialogTitle>
                </DialogHeader>
                <PlanningForm
                  volunteers={volunteers}
                  rooms={rooms}
                  onSubmit={onSubmit}
                  onClose={() => {
                    setDialogOpen(false);
                    setEditingPlanning(null);
                    form.reset();
                  }}
                  form={form}
                  editingPlanning={editingPlanning}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CollapsibleSection>

      <div className="space-y-6 bg-background rounded-lg border p-6">
        <PlanningSection
          title="Actieve Planningen"
          icon={<Calendar className="h-5 w-5" />}
          defaultOpen={true}
        >
          <PlanningTable
            plannings={activePlannings}
            emptyMessage="Er zijn geen actieve planningen voor vandaag"
            volunteers={volunteers}
            rooms={rooms}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchValue={searchActive}
            onSearchChange={setSearchActive}
            showActions={false}
          />
        </PlanningSection>

        <PlanningSection
          title="Toekomstige Planningen"
          icon={<Calendar className="h-5 w-5" />}
          defaultOpen={true}
        >
          <PlanningTable
            plannings={upcomingPlannings}
            emptyMessage="Geen toekomstige planningen gevonden"
            volunteers={volunteers}
            rooms={rooms}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchValue={searchUpcoming}
            onSearchChange={setSearchUpcoming}
            showActions={false}
          />
        </PlanningSection>

        <PlanningSection
          title="Afgelopen Planningen"
          icon={<Calendar className="h-5 w-5" />}
          defaultOpen={false}
        >
          <PlanningTable
            plannings={pastPlannings}
            emptyMessage="Geen afgelopen planningen gevonden"
            volunteers={volunteers}
            rooms={rooms}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchValue={searchPast}
            onSearchChange={setSearchPast}
            showActions={false}
          />
        </PlanningSection>
      </div>
    </div>
  );
};

export default Planning;