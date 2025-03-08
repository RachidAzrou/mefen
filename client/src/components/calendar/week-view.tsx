import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2, UserCircle2 } from "lucide-react";
import { format, startOfWeek, addDays, isWithinInterval, isSameDay, parseISO, addWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { GiWalkieTalkie } from "react-icons/gi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarPDF } from "../pdf/calendar-pdf";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { cn } from "@/lib/utils";

type Planning = {
  id: string;
  volunteerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  isResponsible?: boolean;
};

type Room = {
  id: string;
  name: string;
  channel?: string;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
};

export const WeekView = ({ checkedOutMaterials }: { checkedOutMaterials?: number }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showFullWeek, setShowFullWeek] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    const planningsRef = ref(db, "plannings");
    const volunteersRef = ref(db, "volunteers");
    const roomsRef = ref(db, "rooms");

    onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const planningsList = Object.entries(data).map(([id, planning]: [string, any]) => ({
          id,
          ...planning
        }));
        setPlannings(planningsList);
      } else {
        setPlannings([]);
      }
    });

    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const volunteersList = Object.entries(data).map(([id, volunteer]: [string, any]) => ({
          id,
          ...volunteer
        }));
        setVolunteers(volunteersList);
      } else {
        setVolunteers([]);
      }
    });

    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsList = Object.entries(data).map(([id, room]: [string, any]) => ({
          id,
          ...room
        }));
        setRooms(roomsList);
      } else {
        setRooms([]);
      }
    });
  }, []);

  const getPlanningsForDay = (day: Date) => {
    return plannings.filter(planning => {
      const planningStart = parseISO(planning.startDate);
      const planningEnd = parseISO(planning.endDate);

      return isWithinInterval(day, {
        start: planningStart,
        end: planningEnd
      }) || isSameDay(day, planningStart) || isSameDay(day, planningEnd);
    });
  };

  const getPlanningsForPDF = () => {
    const pdfPlannings = [];
    for (const day of weekDays) {
      const dayPlannings = getPlanningsForDay(day);
      for (const planning of dayPlannings) {
        const volunteer = volunteers.find(v => v.id === planning.volunteerId);
        const room = rooms.find(r => r.id === planning.roomId);
        if (volunteer && room) {
          pdfPlannings.push({
            volunteer: {
              firstName: volunteer.firstName,
              lastName: volunteer.lastName
            },
            room: {
              name: room.name,
              channel: room.channel
            },
            date: day,
            isResponsible: planning.isResponsible
          });
        }
      }
    }
    return pdfPlannings;
  };

  const getPlanningsByRoom = (day: Date) => {
    const dayPlannings = getPlanningsForDay(day);
    const planningsByRoom = new Map<string, Planning[]>();

    rooms.forEach(room => {
      const roomPlannings = dayPlannings.filter(p => p.roomId === room.id);
      if (roomPlannings.length > 0) {
        // Sort plannings to put responsible volunteer first
        const sortedPlannings = [...roomPlannings].sort((a, b) => {
          if (a.isResponsible) return -1;
          if (b.isResponsible) return 1;
          return 0;
        });
        planningsByRoom.set(room.id, sortedPlannings);
      }
    });

    return planningsByRoom;
  };

  const goToPreviousWeek = () => setCurrentWeek(addWeeks(currentWeek, -1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const publishSchedule = () => {
    const publicUrl = `${window.location.origin}/calendar/public`;
    window.open(publicUrl, '_blank');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border">
        <h2 className="text-base sm:text-xl font-semibold text-[#D9A347]">
          Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
        </h2>

        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 sm:h-9 px-2 sm:px-4"
            >
              Vandaag
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 sm:h-9">
                <Share2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Delen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <PDFDownloadLink
                document={
                  <CalendarPDF
                    weekStart={weekStart}
                    plannings={getPlanningsForPDF()}
                    logoUrl={`${window.location.origin}/static/Naamloos.png`}
                  />
                }
                fileName={`weekplanning-${format(weekStart, 'yyyy-MM-dd')}.pdf`}
              >
                {({ loading }) => (
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? "PDF wordt gemaakt..." : "Download PDF"}
                  </DropdownMenuItem>
                )}
              </PDFDownloadLink>
              <DropdownMenuItem onClick={publishSchedule}>
                <Share2 className="h-4 w-4 mr-2" />
                Publiceren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
        {weekDays.map((day, index) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          const planningsByRoom = getPlanningsByRoom(day);
          const shouldHide = !showFullWeek && index > 2;

          return (
            <Card
              key={day.toISOString()}
              className={cn(
                "min-w-full sm:min-w-0",
                isToday && "ring-2 ring-[#D9A347] ring-offset-2",
                shouldHide && "hidden lg:block"
              )}
            >
              <CardContent className="p-3 sm:p-4">
                <div className={cn(
                  "text-sm font-semibold mb-1 sm:mb-2",
                  isToday ? "text-[#D9A347]" : "text-[#963E56]"
                )}>
                  {format(day, "EEEE", { locale: nl })}
                </div>
                <div className="text-xs text-muted-foreground mb-3 sm:mb-4">
                  {format(day, "d MMMM", { locale: nl })}
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {rooms.map(room => {
                    const roomPlannings = planningsByRoom.get(room.id);
                    if (!roomPlannings) return null;

                    return (
                      <div key={room.id} className="space-y-2 rounded-lg bg-[#963E56]/5 p-2">
                        <div className="font-medium text-sm text-[#963E56] border-b border-[#963E56]/10 pb-1">
                          <div className="flex items-center justify-between mb-1">
                            <span>{room.name}</span>
                            {room.channel && (
                              <div className="flex items-center gap-1 text-[10px] text-[#963E56]">
                                <GiWalkieTalkie className="h-3 w-3" />
                                <span>{room.channel}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 pl-2">
                          {roomPlannings.map(planning => {
                            const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                            const name = volunteer
                              ? `${volunteer.firstName} ${volunteer.lastName[0]}.`
                              : 'Niet toegewezen';
                            return (
                              <div
                                key={planning.id}
                                className={cn(
                                  "text-[11px] leading-tight p-1.5 rounded border border-[#963E56]/10",
                                  planning.isResponsible ? "bg-[#963E56]/10" : "bg-white/50"
                                )}
                              >
                                <div className="font-medium text-[#963E56]/90 overflow-hidden whitespace-nowrap flex items-center gap-1.5">
                                  <span>{name}</span>
                                  {planning.isResponsible && (
                                    <UserCircle2 className="h-3 w-3 shrink-0 text-[#963E56]" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {planningsByRoom.size === 0 && (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                      Geen toewijzingen
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="block lg:hidden text-center">
        <Button
          variant="outline"
          onClick={() => setShowFullWeek(!showFullWeek)}
          className="w-full"
        >
          {showFullWeek ? "Toon minder dagen" : "Toon volledige week"}
        </Button>
      </div>
    </div>
  );
};