import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2, Package2, Users2, UserCheck, House } from "lucide-react";
import { format, addWeeks, startOfWeek, addDays, isWithinInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarPDF } from "../pdf/calendar-pdf";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { cn } from "@/lib/utils";

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
};

type Room = {
  id: string;
  name: string;
};

type Planning = {
  id: string;
  volunteerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
};

type WeekViewProps = {
  checkedOutMaterials: number;
}

export function WeekView({ checkedOutMaterials }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    const fetchData = async () => {
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
    };

    fetchData();
  }, []);

  const goToPreviousWeek = () => setCurrentWeek(addWeeks(currentWeek, -1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const publishSchedule = () => {
    const publicUrl = `${window.location.origin}/calendar/public`;
    window.open(publicUrl, '_blank');
  };

  const getPlanningsForDay = (day: Date) => {
    return plannings.filter(planning => {
      const startDate = new Date(planning.startDate);
      const endDate = new Date(planning.endDate);
      return isWithinInterval(day, { start: startDate, end: endDate });
    });
  };

  const getPlanningsForPDF = () => {
    let planningsForPDF = [];
    for (const day of weekDays) {
      const dayPlannings = getPlanningsForDay(day);
      for (const planning of dayPlannings) {
        const volunteer = volunteers.find(v => v.id === planning.volunteerId);
        const room = rooms.find(r => r.id === planning.roomId);
        planningsForPDF.push({
          volunteer: {
            firstName: volunteer?.firstName || 'Onbekend',
            lastName: volunteer?.lastName || 'Vrijwilliger'
          },
          room: {
            name: room?.name || 'Onbekende ruimte'
          },
          date: day
        });
      }
    }
    return planningsForPDF;
  };

  const totalVolunteers = volunteers.length;
  const totalRooms = rooms.length;
  const activeVolunteers = plannings.filter(p => new Date(p.endDate) >= new Date()).length;

  // Group plannings by room for a specific day
  const getPlanningsByRoom = (day: Date) => {
    const dayPlannings = getPlanningsForDay(day);
    const planningsByRoom = new Map<string, Planning[]>();

    rooms.forEach(room => {
      const roomPlannings = dayPlannings.filter(p => p.roomId === room.id);
      if (roomPlannings.length > 0) {
        planningsByRoom.set(room.id, roomPlannings);
      }
    });

    return planningsByRoom;
  };

  return (
    <div className="space-y-6">
      {/* Header sectie */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
        <h2 className="text-lg sm:text-xl font-semibold text-[#D9A347]">
          Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
        </h2>

        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-9 px-4 mx-2"
            >
              Vandaag
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Share2 className="h-4 w-4 mr-2" />
                Delen
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

      {/* Week overzicht */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          const planningsByRoom = getPlanningsByRoom(day);

          return (
            <Card
              key={day.toISOString()}
              className={cn(
                "min-w-[280px] md:min-w-0",
                isToday && "ring-2 ring-[#D9A347] ring-offset-2"
              )}
            >
              <CardContent className="p-4">
                <div className={cn(
                  "text-base font-semibold mb-2",
                  isToday ? "text-[#D9A347]" : "text-[#963E56]"
                )}>
                  {format(day, "EEEE", { locale: nl })}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {format(day, "d MMMM", { locale: nl })}
                </div>

                <div className="space-y-4">
                  {rooms.map(room => {
                    const roomPlannings = planningsByRoom.get(room.id);
                    if (!roomPlannings) return null;

                    return (
                      <div key={room.id} className="space-y-1">
                        <div className="font-medium text-xs text-[#963E56]/80 border-b pb-0.5">
                          {room.name}
                        </div>
                        <div className="space-y-1 pl-1">
                          {roomPlannings.map(planning => {
                            const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                            return (
                              <div
                                key={planning.id}
                                className="text-[11px] leading-tight p-1.5 rounded bg-[#963E56]/5 border border-[#963E56]/10"
                              >
                                <div className="font-medium text-[#963E56]/90 overflow-hidden">
                                  {volunteer
                                    ? `${volunteer.firstName} ${volunteer.lastName}`
                                    : 'Niet toegewezen'
                                  }
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

      {/* Informatie cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Package2 className="h-6 w-6 md:h-8 md:w-8 text-[#963E56]/80" />
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Uitgeleende Materialen</p>
                <p className="text-xl md:text-2xl font-bold text-[#963E56]">{checkedOutMaterials}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Users2 className="h-6 w-6 md:h-8 md:w-8 text-[#963E56]/80" />
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Totaal Vrijwilligers</p>
                <p className="text-xl md:text-2xl font-bold text-[#963E56]">{totalVolunteers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <House className="h-6 w-6 md:h-8 md:w-8 text-[#963E56]/80" />
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Totaal Ruimtes</p>
                <p className="text-xl md:text-2xl font-bold text-[#963E56]">{totalRooms}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-[#963E56]/80" />
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Actieve Vrijwilligers</p>
                <p className="text-xl md:text-2xl font-bold text-[#963E56]">{activeVolunteers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}