import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Search, Trash2, Edit2, ShieldCheck } from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { useRole } from "@/hooks/use-role";
import { db } from "@/lib/firebase";
import { ref, onValue, remove, push, set, update } from "firebase/database";
import { PlanningDialog } from "@/components/planning/planning-dialog";
import { planningSchema, type Planning, type PlanningFormData } from "@/components/planning/planning-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function PlanningPage() {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<{ id: string; firstName: string; lastName: string; }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string; }[]>([]);
  const [searchActive, setSearchActive] = useState("");
  const [searchUpcoming, setSearchUpcoming] = useState("");
  const [searchPast, setSearchPast] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<Planning | null>(null);

  const { isAdmin } = useRole();
  const { toast } = useToast();

  const form = useForm<PlanningFormData>({
    resolver: zodResolver(planningSchema),
    defaultValues: {
      isBulkPlanning: false,
      volunteerId: "",
      roomId: "",
      startDate: "",
      endDate: "",
      selectedVolunteers: [],
      selectedRoomId: "",
      isResponsible: false,
      responsibleVolunteerId: undefined,
    }
  });

  useEffect(() => {
    const planningsRef = ref(db, "plannings");
    const roomsRef = ref(db, "rooms");
    const volunteersRef = ref(db, "volunteers");

    const unsubPlannings = onValue(planningsRef, snapshot => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data).map(([id, planning]: [string, any]) => ({
        id,
        ...planning
      })) : [];
      setPlannings(planningsList);
    });

    const unsubRooms = onValue(roomsRef, snapshot => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]: [string, any]) => ({
        id,
        ...room
      })) : [];
      setRooms(roomsList);
    });

    const unsubVolunteers = onValue(volunteersRef, snapshot => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]: [string, any]) => ({
        id,
        ...volunteer
      })) : [];
      setVolunteers(volunteersList);
    });

    return () => {
      unsubPlannings();
      unsubRooms();
      unsubVolunteers();
    };
  }, []);

  const handleSubmit = async (data: PlanningFormData) => {
    try {
      if (data.isBulkPlanning) {
        // Handle bulk planning
        for (const volunteerId of data.selectedVolunteers) {
          if (data.responsibleVolunteerId && data.responsibleVolunteerId === volunteerId) {
            // Check for existing responsible
            const existingResponsible = plannings.find(
              p => p.roomId === data.selectedRoomId &&
                p.isResponsible &&
                parseISO(p.startDate) <= parseISO(data.startDate) &&
                parseISO(p.endDate) >= parseISO(data.startDate)
            );

            if (existingResponsible) {
              const prevRef = ref(db, `plannings/${existingResponsible.id}`);
              await update(prevRef, { isResponsible: false });
            }
          }

          const newPlanningRef = push(ref(db, "plannings"));
          await set(newPlanningRef, {
            volunteerId,
            roomId: data.selectedRoomId,
            startDate: format(new Date(data.startDate), 'yyyy-MM-dd'),
            endDate: format(new Date(data.endDate), 'yyyy-MM-dd'),
            isResponsible: data.responsibleVolunteerId === volunteerId
          });
        }
      } else {
        // Handle single planning
        if (data.isResponsible) {
          // Check for existing responsible
          const existingResponsible = plannings.find(
            p => p.roomId === data.roomId &&
              p.isResponsible &&
              p.id !== editingPlanning?.id &&
              parseISO(p.startDate) <= parseISO(data.startDate) &&
              parseISO(p.endDate) >= parseISO(data.startDate)
          );

          if (existingResponsible) {
            const prevRef = ref(db, `plannings/${existingResponsible.id}`);
            await update(prevRef, { isResponsible: false });
          }
        }

        const planningRef = editingPlanning
          ? ref(db, `plannings/${editingPlanning.id}`)
          : push(ref(db, "plannings"));

        await set(planningRef, {
          volunteerId: data.volunteerId,
          roomId: data.roomId,
          startDate: format(new Date(data.startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(data.endDate), 'yyyy-MM-dd'),
          isResponsible: data.isResponsible
        });
      }

      toast({
        title: "Succes",
        description: "Planning is opgeslagen"
      });

      setDialogOpen(false);
      form.reset();
      setEditingPlanning(null);
    } catch (error) {
      console.error("Error saving planning:", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden bij het opslaan van de planning"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(db, `plannings/${id}`));
      toast({
        title: "Succes",
        description: "Planning is verwijderd"
      });
    } catch (error) {
      console.error("Error deleting planning:", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van de planning"
      });
    }
  };

  const handleBulkDelete = async (plannings: Planning[]) => {
    try {
      const deletePromises = plannings.map(planning =>
        remove(ref(db, `plannings/${planning.id}`))
      );
      await Promise.all(deletePromises);
      toast({
        title: "Succes",
        description: "Planningen zijn verwijderd"
      });
    } catch (error) {
      console.error("Error deleting plannings:", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van de planningen"
      });
    }
  };

  const now = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const activePlannings = useMemo(() => {
    return plannings.filter(planning => {
      const start = parseISO(planning.startDate);
      const end = parseISO(planning.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return start <= now && end >= now;
    });
  }, [plannings, now]);

  const upcomingPlannings = useMemo(() => {
    return plannings.filter(planning => {
      const start = parseISO(planning.startDate);
      start.setHours(0, 0, 0, 0);
      return start > now;
    });
  }, [plannings, now]);

  const pastPlannings = useMemo(() => {
    return plannings.filter(planning => {
      const end = parseISO(planning.endDate);
      end.setHours(0, 0, 0, 0);
      return end < now;
    });
  }, [plannings, now]);

  // Sort plannings to show responsible volunteers first within each room section
  const sortPlannings = (plannings: Planning[]) => {
    return [...plannings].sort((a, b) => {
      if (a.isResponsible && !b.isResponsible) return -1;
      if (!a.isResponsible && b.isResponsible) return 1;
      return 0;
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-[#963E56]" />
          <h1 className="text-3xl font-bold text-[#963E56]">Planning</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#963E56]/10 rounded-full p-2">
                <CalendarIcon className="h-5 w-5 text-[#963E56]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#963E56]">Actieve Planningen</div>
                <div className="text-2xl font-bold">{activePlannings.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#963E56]/10 rounded-full p-2">
                <CalendarIcon className="h-5 w-5 text-[#963E56]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#963E56]">Toekomstige Planningen</div>
                <div className="text-2xl font-bold">{upcomingPlannings.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#963E56]/10 rounded-full p-2">
                <CalendarIcon className="h-5 w-5 text-[#963E56]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#963E56]">Afgelopen Planningen</div>
                <div className="text-2xl font-bold">{pastPlannings.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <PlanningDialog
          key="planning-dialog"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingPlanning={editingPlanning}
          form={form}
          onSubmit={handleSubmit}
          volunteers={volunteers}
          rooms={rooms}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#963E56]">Actieve Planningen</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchActive}
                  onChange={(e) => setSearchActive(e.target.value)}
                  className="pl-9"
                />
              </div>
              {activePlannings.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Weet je zeker dat je alle ${activePlannings.length} actieve planningen wilt verwijderen?`)) {
                      handleBulkDelete(activePlannings);
                    }
                  }}
                  className="whitespace-nowrap bg-[#963E56] hover:bg-[#963E56]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Leegmaken
                </Button>
              )}
            </div>
          </div>
          {activePlannings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Geen actieve planningen
            </div>
          ) : (
            <div className="space-y-4">
              {sortPlannings(activePlannings).map((planning) => (
                <PlanningItem
                  key={planning.id}
                  planning={planning}
                  volunteer={volunteers.find(v => v.id === planning.volunteerId)}
                  room={rooms.find(r => r.id === planning.roomId)}
                  onEdit={() => {
                    setEditingPlanning(planning);
                    form.reset({
                      isBulkPlanning: false,
                      volunteerId: planning.volunteerId,
                      roomId: planning.roomId,
                      startDate: planning.startDate,
                      endDate: planning.endDate,
                      isResponsible: planning.isResponsible,
                    });
                    setDialogOpen(true);
                  }}
                  onDelete={() => handleDelete(planning.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#963E56]">Toekomstige Planningen</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchUpcoming}
                  onChange={(e) => setSearchUpcoming(e.target.value)}
                  className="pl-9"
                />
              </div>
              {upcomingPlannings.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Weet je zeker dat je alle ${upcomingPlannings.length} toekomstige planningen wilt verwijderen?`)) {
                      handleBulkDelete(upcomingPlannings);
                    }
                  }}
                  className="whitespace-nowrap bg-[#963E56] hover:bg-[#963E56]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Leegmaken
                </Button>
              )}
            </div>
          </div>
          {upcomingPlannings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Geen toekomstige planningen
            </div>
          ) : (
            <div className="space-y-4">
              {sortPlannings(upcomingPlannings).map((planning) => (
                <PlanningItem
                  key={planning.id}
                  planning={planning}
                  volunteer={volunteers.find(v => v.id === planning.volunteerId)}
                  room={rooms.find(r => r.id === planning.roomId)}
                  onEdit={() => {
                    setEditingPlanning(planning);
                    form.reset({
                      isBulkPlanning: false,
                      volunteerId: planning.volunteerId,
                      roomId: planning.roomId,
                      startDate: planning.startDate,
                      endDate: planning.endDate,
                      isResponsible: planning.isResponsible,
                    });
                    setDialogOpen(true);
                  }}
                  onDelete={() => handleDelete(planning.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#963E56]">Afgelopen Planningen</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchPast}
                  onChange={(e) => setSearchPast(e.target.value)}
                  className="pl-9"
                />
              </div>
              {pastPlannings.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Weet je zeker dat je alle ${pastPlannings.length} afgelopen planningen wilt verwijderen?`)) {
                      handleBulkDelete(pastPlannings);
                    }
                  }}
                  className="whitespace-nowrap bg-[#963E56] hover:bg-[#963E56]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Leegmaken
                </Button>
              )}
            </div>
          </div>
          {pastPlannings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Geen afgelopen planningen
            </div>
          ) : (
            <div className="space-y-4">
              {sortPlannings(pastPlannings).map((planning) => (
                <PlanningItem
                  key={planning.id}
                  planning={planning}
                  volunteer={volunteers.find(v => v.id === planning.volunteerId)}
                  room={rooms.find(r => r.id === planning.roomId)}
                  onDelete={() => handleDelete(planning.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlanningItemProps {
  planning: Planning;
  volunteer?: { firstName: string; lastName: string };
  room?: { name: string };
  onEdit?: () => void;
  onDelete: () => void;
}

const PlanningItem: React.FC<PlanningItemProps> = ({
  planning,
  volunteer,
  room,
  onEdit,
  onDelete
}) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium",
            planning.isResponsible && "text-[#963E56]"
          )}>
            {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Onbekende vrijwilliger'}
          </span>
          {planning.isResponsible && (
            <div className="bg-[#963E56]/10 rounded-full p-1">
              <ShieldCheck className="h-4 w-4 text-[#963E56]" />
            </div>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {room?.name || 'Onbekende ruimte'}
        </div>
        <div className="text-sm text-muted-foreground">
          {format(parseISO(planning.startDate), 'd MMM yyyy', { locale: nl })} -&nbsp;
          {format(parseISO(planning.endDate), 'd MMM yyyy', { locale: nl })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export { PlanningPage };
export default PlanningPage;