import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Search, Plus, Settings2, Trash2, Edit2, ChevronRight, UserCircle2, House } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { ref, onValue, remove, push, get, update } from "firebase/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlanningForm } from "@/components/planning/planning-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CustomCalendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";

const planningSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht").optional(),
  roomId: z.string().min(1, "Ruimte is verplicht").optional(),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  isBulkPlanning: z.boolean().default(false),
  selectedVolunteers: z.array(z.string()).default([]),
  selectedRooms: z.array(z.string()).default([]),
  isResponsible: z.boolean().default(false)
});

interface Planning {
  id: string;
  volunteerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  isResponsible?: boolean;
}
const PlanningTable = ({
  plannings,
  emptyMessage,
  volunteers,
  rooms,
  onDelete,
  onEdit,
  searchValue,
  onSearchChange,
  showActions = false,
}: {
  plannings: Planning[];
  emptyMessage: string;
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
  onDelete: (id: string) => void;
  onEdit?: (planning: Planning) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  showActions?: boolean;
}) => {
  const [dateFilter, setDateFilter] = useState(undefined);
  const [sortByDate, setSortByDate] = useState(false);
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedRooms, setExpandedRooms] = useState({});

  const planningsByRoom = plannings.reduce((acc, planning) => {
    const room = rooms.find(r => r.id === planning.roomId);
    if (!acc[planning.roomId]) {
      acc[planning.roomId] = {
        room: room || { id: planning.roomId, name: 'Onbekende ruimte' },
        plannings: []
      };
    }
    acc[planning.roomId].plannings.push(planning);
    return acc;
  }, {} as Record<string, { room: typeof rooms[0], plannings: Planning[] }>);

  const filteredPlanningsByRoom = Object.entries(planningsByRoom)
    .reduce((acc, [roomId, { room, plannings }]) => {
      const filteredPlannings = plannings.filter(planning => {
        const matchesSearch = searchValue.toLowerCase() === '' || (() => {
          const volunteer = volunteers.find(v => v.id === planning.volunteerId);
          const volunteerName = volunteer ? `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase() : '';
          const roomName = room.name.toLowerCase();
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

      if (filteredPlannings.length > 0) {
        acc[roomId] = { room, plannings: filteredPlannings };
      }
      return acc;
    }, {} as Record<string, { room: typeof rooms[0], plannings: Planning[] }>);

  const sortedPlanningsByRoom = Object.entries(filteredPlanningsByRoom)
    .reduce((acc, [roomId, { room, plannings }]) => {
      const sortedPlannings = [...plannings].sort((a, b) => {
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

      acc[roomId] = { room, plannings: sortedPlannings };
      return acc;
    }, {} as Record<string, { room: typeof rooms[0], plannings: Planning[] }>);

  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op vrijwilliger of ruimte..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSortByDate(!sortByDate);
                if (sortByDate) {
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                }
              }}
              className={cn("gap-2", sortByDate && "bg-accent/5")}
            >
              <Calendar className="h-4 w-4" />
              <span>Sorteren op datum</span>
              {sortByDate && (sortDirection === 'asc' ? '↑' : '↓')}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Filter op datum</span>
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
                className="px-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(sortedPlanningsByRoom).length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          Object.entries(sortedPlanningsByRoom).map(([roomId, { room, plannings }]) => (
            <div key={roomId} className="space-y-4">
              <Card key={roomId} className="overflow-hidden">
                <button
                  className="w-full px-6 py-4 border-b flex items-center justify-between hover:bg-[#963E56]/5 transition-colors"
                  onClick={() => toggleRoom(roomId)}
                >
                  <div className="flex items-center gap-3">
                    <House className="h-5 w-5 text-[#963E56]" />
                    <h3 className="font-medium text-[#963E56]">{room.name}</h3>
                    <div className="text-sm text-[#963E56]/70">
                      ({plannings.length} planning{plannings.length !== 1 ? 'en' : ''})
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-5 w-5 text-[#963E56]/70 transition-transform",
                    expandedRooms[roomId] && "transform rotate-90"
                  )} />
                </button>

                {expandedRooms[roomId] && (
                  <div className="divide-y divide-[#963E56]/10">
                    {plannings.map((planning) => {
                      const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
                      return (
                        <div key={planning.id} className="p-4 sm:p-6 bg-white">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium",
                                  planning.isResponsible ? "text-[#963E56]" : "text-gray-900"
                                )}>
                                  {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "-"}
                                </span>
                                {planning.isResponsible && (
                                  <UserCircle2 className="w-4 h-4 text-[#963E56]" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {format(parseISO(planning.startDate), "EEEE d MMM yyyy", { locale: nl })}
                                  </span>
                                </div>
                                <span>→</span>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {format(parseISO(planning.endDate), "EEEE d MMM yyyy", { locale: nl })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {showActions && (
                              <div className="flex items-center gap-2">
                                {onEdit && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => onEdit(planning)}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Bewerken
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDelete(planning.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          ))
        )}
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
      className="rounded-lg border bg-card"
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
            isEditing && "bg-accent/5"
          )}
        >
          <Settings2 className="h-5 w-5" />
        </Button>
      }
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
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
      startDate: format(parseISO(planning.startDate), 'yyyy-MM-dd'),
      endDate: format(parseISO(planning.endDate), 'yyyy-MM-dd'),
      isBulkPlanning: false,
      selectedVolunteers: [],
      selectedRooms: [],
      isResponsible: planning.isResponsible || false
    });
    setDialogOpen(true);
  };
  const handleDelete = async (id: string) => {
    try {
      const planningRef = ref(db, `plannings/${id}`);
      const snapshot = await get(planningRef);
      const planningData = snapshot.val();
      const volunteer = volunteers.find(v => v.id === planningData.volunteerId);
      const room = rooms.find(r => r.id === planningData.roomId);
      await remove(planningRef);
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
      if (editingPlanning) {
        // Update existing planning
        const planningData = {
          volunteerId: data.volunteerId,
          roomId: data.roomId,
          startDate: format(new Date(data.startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(data.endDate), 'yyyy-MM-dd'),
          isResponsible: data.isResponsible
        };

        const planningRef = ref(db, `plannings/${editingPlanning.id}`);
        await update(planningRef, planningData);

        const volunteer = volunteers.find(v => v.id === data.volunteerId);
        const room = rooms.find(r => r.id === data.roomId);

        await logUserAction(
          UserActionTypes.PLANNING_UPDATE,
          "Planning bijgewerkt",
          {
            type: 'planning',
            id: editingPlanning.id,
            details: `${volunteer?.firstName} ${volunteer?.lastName} bijgewerkt voor ${room?.name}`,
            targetName: `${room?.name} (${planningData.startDate} - ${planningData.endDate})`
          }
        );
      } else {
        const planningData = {
          startDate: format(new Date(data.startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(data.endDate), 'yyyy-MM-dd')
        };
        const checkForDuplicates = (volunteerId: string, startDate: string, endDate: string) => {
          return plannings.some(planning =>
            planning.volunteerId === volunteerId &&
            ((planning.startDate >= startDate && planning.startDate <= endDate) ||
              (planning.endDate >= startDate && planning.endDate <= endDate))
          );
        };
        if (data.isBulkPlanning) {
          const volunteers = data.selectedVolunteers || [];
          const rooms = data.selectedRooms || [];
          const duplicateVolunteers = volunteers.filter(volunteerId =>
            checkForDuplicates(volunteerId, planningData.startDate, planningData.endDate)
          );
          if (duplicateVolunteers.length > 0) {
            const duplicateNames = duplicateVolunteers.map(id => {
              const volunteer = volunteers.find(v => v.id === id);
              return volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Onbekend';
            }).join(', ');
            throw new Error(`De volgende vrijwilligers zijn al ingepland op deze datum(s): ${duplicateNames}`);
          }
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
                ...planningData,
                isResponsible: false
              });
            }
          }
        } else {
          if (data.volunteerId && checkForDuplicates(data.volunteerId, planningData.startDate, planningData.endDate)) {
            const volunteer = volunteers.find(v => v.id === data.volunteerId);
            throw new Error(`${volunteer?.firstName} ${volunteer?.lastName} is al ingepland op deze datum(s)`);
          }
          if (data.isResponsible) {
            const existingResponsible = plannings.find(
              p => p.roomId === data.roomId && p.isResponsible
            );
            if (existingResponsible) {
              const prevRef = ref(db, `plannings/${existingResponsible.id}`);
              await update(prevRef, { isResponsible: false });
            }
          }
          const result = await push(ref(db, "plannings"), {
            volunteerId: data.volunteerId,
            roomId: data.roomId,
            isResponsible: data.isResponsible,
            ...planningData
          });
          const volunteer = volunteers.find(v => v.id === data.volunteerId);
          const room = rooms.find(r => r.id === data.roomId);
          await logUserAction(
            UserActionTypes.PLANNING_CREATE,
            data.isResponsible ? "Verantwoordelijke toegewezen" : "Planning toegevoegd",
            {
              type: 'planning',
              id: result.key,
              details: `${volunteer?.firstName} ${volunteer?.lastName} ${data.isResponsible ? 'als verantwoordelijke ' : ''}ingepland voor ${room?.name}`,
              targetName: `${room?.name} (${planningData.startDate} - ${planningData.endDate})`
            }
          );
        }
      }
      setDialogOpen(false);
      setEditingPlanning(null);
      form.reset();
    } catch (error) {
      console.error("Submit error:", error);
      throw error;
    }
  };
  const handleSearchChange = async (value: string, type: 'active' | 'upcoming' | 'past') => {
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
  const pastPlannings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today, { locale: nl });
    return plannings.map(planning => {
      const planningStart = parseISO(planning.startDate);
      const planningEnd = parseISO(planning.endDate);
      planningStart.setHours(0, 0, 0, 0);
      planningEnd.setHours(0, 0, 0, 0);
      if (planningStart < today && planningStart >= weekStart) {
        return {
          ...planning,
          endDate: planningEnd > today ? format(today, 'yyyy-MM-dd') : planning.endDate
        };
      } else if (planningStart < weekStart && planningEnd >= weekStart && planningEnd < today) {
        return {
          ...planning,
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(new Date(Math.min(planningEnd.getTime(), today.getTime())), 'yyyy-MM-dd')
        };
      }
      return null;
    }).filter((p): p is Planning => p !== null);
  }, [plannings]);
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#963E56]">Planning</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center">
              <div className="bg-[#963E56]/10 rounded-full p-2 mr-2 sm:mr-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#963E56]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#963E56]">Actieve Planningen</div>
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
                <div className="text-sm font-medium text-[#963E56]">Toekomstige Planningen</div>
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
                <div className="text-sm font-medium text-[#963E56]">Afgelopen Planningen</div>
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
            }} className="gap-2 bg-[#963E56] hover:bg-[#963E56]/90 text-white">
              <Plus className="h-4 w-4" />
              <span>Inplannen</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[450px] p-4 sm:p-6">
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
              plannings={plannings}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <PlanningSection
          title="Actieve Planningen"
          icon={<Calendar className="h-5 w-5 text-[#963E56]" />}
          defaultOpen={true}
        >
          <div className="mb-4 p-4 rounded-lg border border-muted bg-muted/5">
            <div className="flex items-center gap-2 text-sm text-[#963E56]">
              <Calendar className="h-4 w-4" />
              <span>Planningen voor vandaag</span>
            </div>
          </div>
          <PlanningTable
            plannings={activePlannings}
            emptyMessage="Er zijn geen actieve planningen voor vandaag"
            volunteers={volunteers}
            rooms={rooms}
            onDelete={handleDelete}
            onEdit={handleEdit}
            searchValue={searchActive}
            onSearchChange={(value) => handleSearchChange(value, 'active')}
            showActions={true}
          />
        </PlanningSection>

        <PlanningSection
          title="Toekomstige Planningen"
          icon={<Calendar className="h-5 w-5 text-[#963E56]" />}
          defaultOpen={true}
        >
          <div className="mb-4 p-4 rounded-lg border border-muted bg-muted/5">
            <div className="flex items-center gap-2 text-sm text-[#963E56]">
              <Calendar className="h-4 w-4" />
              <span>Geplande toekomstige activiteiten</span>
            </div>
          </div>
          <PlanningTable
            plannings={upcomingPlannings}
            emptyMessage="Geen toekomstige planningen gevonden"
            volunteers={volunteers}
            rooms={rooms}
            onDelete={handleDelete}
            onEdit={handleEdit}
            searchValue={searchUpcoming}
            onSearchChange={(value) => handleSearchChange(value, 'upcoming')}
            showActions={true}
          />
        </PlanningSection>

        <PlanningSection
          title="Afgelopen Planningen"
          icon={<Calendar className="h-5 w-5 text-[#963E56]" />}
          defaultOpen={false}
        >
          <div className="mb-4 p-4 rounded-lg border border-muted bg-muted/5">
            <div className="flex items-center gap-2 text-sm text-[#963E56]">
              <Calendar className="h-4 w-4" />
              <span>Historisch overzicht van afgelopen planningen</span>
            </div>
          </div>
          <PlanningTable
            plannings={pastPlannings}
            emptyMessage="Geen afgelopen planningen gevonden"
            volunteers={volunteers}
            rooms={rooms}
            onDelete={handleDelete}
            onEdit={handleEdit}
            searchValue={searchPast}
            onSearchChange={(value) => handleSearchChange(value, 'past')}
            showActions={true}
          />
        </PlanningSection>
      </div>
    </div>
  );
};

export default Planning;