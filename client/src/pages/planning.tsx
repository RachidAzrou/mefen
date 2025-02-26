import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Calendar, Search, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { ref, onValue, remove, push, get } from "firebase/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlanningForm } from "@/components/planning/planning-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CustomCalendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check } from "lucide-react";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";


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
  onDelete,
  searchValue,
  onSearchChange,
  showActions = false,
}: {
  plannings: Planning[];
  emptyMessage: string;
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
  onDelete: (id: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  showActions?: boolean;
}) => {
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [sortByDate, setSortByDate] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredPlannings = plannings.filter(planning => {
    const matchesSearch = searchValue.toLowerCase() === '' || (() => {
      const volunteer = volunteers.find(v => v.id === planning.volunteerId);
      const room = rooms.find(r => r.id === planning.roomId);
      const volunteerName = volunteer ? `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase() : '';
      const roomName = room ? room.name.toLowerCase() : '';
      return volunteerName.includes(searchValue.toLowerCase()) ||
             roomName.includes(searchValue.toLowerCase());
    })();

    const matchesDate = !dateFilter || (() => {
      const filterDate = startOfDay(dateFilter);
      const planningStart = startOfDay(parseISO(planning.startDate));
      const planningEnd = startOfDay(parseISO(planning.endDate));
      return filterDate.getTime() === planningStart.getTime() || filterDate.getTime() === planningEnd.getTime();
    })();

    return matchesSearch && matchesDate;
  });

  const sortedPlannings = React.useMemo(() => {
    const sorted = [...filteredPlannings].sort((a, b) => {
      if (sortByDate) {
        const startDateComparison = parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
        if (startDateComparison !== 0) {
          return sortDirection === 'asc' ? startDateComparison : -startDateComparison;
        }
        const endDateComparison = parseISO(a.endDate).getTime() - parseISO(b.endDate).getTime();
        return sortDirection === 'asc' ? endDateComparison : -endDateComparison;
      }
      return 0;
    });
    return sorted;
  }, [filteredPlannings, sortByDate, sortDirection]);

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {showActions && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Zoek op vrijwilliger of ruimte..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSortByDate(!sortByDate);
                if (sortByDate) {
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                }
              }}
              className={cn("w-full sm:w-auto gap-2", sortByDate && "bg-primary/10 text-primary")}
            >
              <Calendar className="h-4 w-4" />
              <span>Sorteren op datum</span>
              {sortByDate && (sortDirection === 'asc' ? '↑' : '↓')}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 flex-shrink-0">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {dateFilter ? format(dateFilter, 'd MMM yyyy', { locale: nl }) : 'Filter op datum'}
                  </span>
                  <span className="sm:hidden">
                    {dateFilter ? format(dateFilter, 'dd/MM', { locale: nl }) : 'Datum'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CustomCalendar
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
                className="px-2 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        {/* Desktop view */}
        <div className="hidden sm:block">
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
              {sortedPlannings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showActions ? 4 : 3}
                    className="h-24 text-center"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                sortedPlannings.map((planning) => {
                  const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
                  const room = rooms.find((r) => r.id === planning.roomId);

                  return (
                    <TableRow key={planning.id}>
                      <TableCell className="font-medium">
                        {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "-"}
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
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(planning.id)}
                              className="text-[#963E56] hover:text-[#963E56]/90 hover:bg-[#963E56]/10"
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Mobile view */}
        <div className="block sm:hidden divide-y">
          {sortedPlannings.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            sortedPlannings.map((planning) => {
              const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
              const room = rooms.find((r) => r.id === planning.roomId);

              return (
                <div key={planning.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">
                      {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "-"}
                    </div>
                    {showActions && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(planning.id)}
                        className="text-[#963E56] hover:text-[#963E56]/90 hover:bg-[#963E56]/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {room ? room.name : "-"}
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Start: {format(parseISO(planning.startDate), "d MMM yyyy", { locale: nl })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Eind: {format(parseISO(planning.endDate), "d MMM yyyy", { locale: nl })}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
            "h-8 w-8 text-[#963E56]",
            isEditing && "bg-[#963E56]/10"
          )}
        >
          <Settings2 className="h-5 w-5" />
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
  );
};

const Planning = () => {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<{ id: string; firstName: string; lastName: string; }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string; }[]>([]);
  const [searchActive, setSearchActive] = useState("");
  const [searchUpcoming, setSearchUpcoming] = useState("");
  const [searchPast, setSearchPast] = useState("");
  const [dateFilterActive, setDateFilterActive] = useState<Date | undefined>();
  const [dateFilterUpcoming, setDateFilterUpcoming] = useState<Date | undefined>();
  const [dateFilterPast, setDateFilterPast] = useState<Date | undefined>();
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
    logUserAction(UserActionTypes.PLANNING_EDIT, "Planning bewerken geopend", { type: 'planning', id: planning.id });
  };

  const handleDelete = async (id: string) => {
    try {
      // Get planning details before deletion for logging
      const planningRef = ref(db, `plannings/${id}`);
      const snapshot = await get(planningRef);
      const planningData = snapshot.val();

      const volunteer = volunteers.find(v => v.id === planningData.volunteerId);
      const room = rooms.find(r => r.id === planningData.roomId);

      // Delete the planning
      await remove(planningRef);

      // Log the delete action with details
      await logUserAction(
        UserActionTypes.PLANNING_DELETE,
        `Planning verwijderd voor ${volunteer?.firstName} ${volunteer?.lastName}`,
        {
          type: 'planning',
          id,
          details: `Verwijderd uit ${room?.name} (${planningData.startDate} - ${planningData.endDate})`
        }
      );
    } catch (error) {
      console.error("Error deleting planning:", error);
    }
  };

  const onSubmit = async (data: z.infer<typeof planningSchema>) => {
    try {
      console.log("Planning submission - Raw data:", {
        startDate: data.startDate,
        endDate: data.endDate
      });

      const planningData = {
        startDate: format(new Date(data.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(data.endDate), 'yyyy-MM-dd')
      };

      if (data.isBulkPlanning) {
        const volunteers = data.selectedVolunteers || [];
        const rooms = data.selectedRooms || [];

        // Log bulk planning creation
        await logUserAction(
          UserActionTypes.PLANNING_BULK_CREATE,
          `Bulk planning aangemaakt voor ${volunteers.length} vrijwilligers en ${rooms.length} ruimtes`,
          {
            type: 'planning',
            details: `Periode: ${planningData.startDate} tot ${planningData.endDate}`
          }
        );

        for (const volunteerId of volunteers) {
          for (const roomId of rooms) {
            await push(ref(db, "plannings"), {
              volunteerId,
              roomId,
              ...planningData
            });
          }
        }
      } else {
        const result = await push(ref(db, "plannings"), {
          volunteerId: data.volunteerId,
          roomId: data.roomId,
          ...planningData
        });

        // Log single planning creation
        const volunteer = volunteers.find(v => v.id === data.volunteerId);
        const room = rooms.find(r => r.id === data.roomId);

        await logUserAction(
          UserActionTypes.PLANNING_CREATE,
          "Planning toegevoegd",
          {
            type: 'planning',
            id: result.key,
            details: `${volunteer?.firstName} ${volunteer?.lastName} ingepland voor ${room?.name}`,
            targetName: `${room?.name} (${planningData.startDate} - ${planningData.endDate})`
          }
        );
      }

      setDialogOpen(false);
      setEditingPlanning(null);
      form.reset();
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const handleSearchChange = async (value: string, type: 'active' | 'upcoming' | 'past') => {
    // Log search action
    await logUserAction(
      UserActionTypes.PLANNING_SEARCH,
      `Planning gezocht in ${type} planningen`,
      { type: 'planning', details: `Zoekterm: ${value}` }
    );

    switch (type) {
      case 'active':
        setSearchActive(value);
        break;
      case 'upcoming':
        setSearchUpcoming(value);
        break;
      case 'past':
        setSearchPast(value);
        break;
    }
  };

  const handleDateFilter = async (date: Date | undefined, type: 'active' | 'upcoming' | 'past') => {
    // Log filter action
    if (date) {
      await logUserAction(
        UserActionTypes.PLANNING_FILTER,
        `Planning gefilterd op datum`,
        {
          type: 'planning',
          details: `Datum: ${format(date, 'dd-MM-yyyy')}, Type: ${type}`
        }
      );
    }
    switch (type) {
      case 'active':
        setDateFilterActive(date);
        break;
      case 'upcoming':
        setDateFilterUpcoming(date);
        break;
      case 'past':
        setDateFilterPast(date);
        break;
    }
  };


  const handleExportPDF = async () => {
    await logUserAction(
      UserActionTypes.GENERATE_PLANNING_PDF,
      "Planning PDF gegenereerd",
      { type: 'planning' }
    );
    // Add PDF generation logic here.  This is a placeholder.
    console.log("Generating PDF...");
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activePlannings = plannings.filter((planning) => {
    const start = parseISO(planning.startDate);
    const end = parseISO(planning.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return start <= now && end >= now;
  });

  const upcomingPlannings = plannings.filter((planning) => {
    const start = parseISO(planning.startDate);
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return start > now;
  });

  const pastPlannings = plannings.filter((planning) => {
    const end = parseISO(planning.endDate);
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return end < now;
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#963E56]">Planning</h1>
      </div>

      <CollapsibleSection
        title="Planning Overzicht"
        icon={<Calendar className="h-5 w-5" />}
        defaultOpen={true}
        titleClassName="text-[#963E56]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center">
                <div className="bg-[#963E56]/10 rounded-full p-2 mr-2 sm:mr-3">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#963E56]" />
                </div>
                <div>
                  <div className="text-sm font-medium">Actieve Planningen</div>
                  <div className="text-lg sm:text-2xl font-bold">{activePlannings.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center">
                <div className="bg-[#963E56]/10 rounded-full p-2 mr-2 sm:mr-3">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#963E56]" />
                </div>
                <div>
                  <div className="text-sm font-medium">Toekomstige Planningen</div>
                  <div className="text-lg sm:text-2xl font-bold">{upcomingPlannings.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center">
                <div className="bg-[#963E56]/10 rounded-full p-2 mr-2 sm:mr-3">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#963E56]" />
                </div>
                <div>
                  <div className="text-sm font-medium">Afgelopen Planningen</div>
                  <div className="text-lg sm:text-2xl font-bold">{pastPlannings.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                logUserAction(UserActionTypes.MODAL_OPEN, "Planning modal geopend");
              }} className="w-full sm:w-auto gap-2 bg-[#963E56] hover:bg-[#963E56]/90">
                <Plus className="h-4 w-4" />
                <span>Inplannen</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[450px] p-4 sm:p-6 bg-white border-none shadow-lg mx-4">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-semibold text-[#963E56]">
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
      </CollapsibleSection>

      <div className="space-y-4 sm:space-y-6 bg-background rounded-lg border p-3 sm:p-6">
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
            onDelete={handleDelete}
            searchValue={searchActive}
            onSearchChange={(value) => handleSearchChange(value, 'active')}
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
            onDelete={handleDelete}
            searchValue={searchUpcoming}
            onSearchChange={(value) => handleSearchChange(value, 'upcoming')}
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
            onDelete={handleDelete}
            searchValue={searchPast}
            onSearchChange={(value) => handleSearchChange(value, 'past')}
            showActions={false}
          />
        </PlanningSection>
      </div>
    </div>
  );
};

export default Planning;