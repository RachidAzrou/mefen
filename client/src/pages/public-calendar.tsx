import { useState, useEffect } from "react";
import { format, startOfWeek, addDays, parseISO, isSameDay, isWithinInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { GiWalkieTalkie } from "react-icons/gi";
import { UserCircle2 } from "lucide-react";
import classNames from "classnames";

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

export default function PublicCalendar() {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [currentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    const planningsRef = ref(db, "plannings");
    onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data).map(([id, planning]) => ({
        id,
        ...(planning as Omit<Planning, "id">),
      })) : [];
      setPlannings(planningsList);
    });

    const roomsRef = ref(db, "rooms");
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]) => ({
        id,
        ...(room as Omit<Room, "id">),
      })) : [];
      setRooms(roomsList);
    });

    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...(volunteer as Omit<Volunteer, "id">),
      })) : [];
      setVolunteers(volunteersList);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <img src="/static/Naamloos.png" alt="MEFEN" className="h-16 mx-auto" />
          <h1 className="text-2xl md:text-3xl font-bold text-center mt-6 text-[#D9A347]">
            Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Desktop View */}
        <div className="hidden md:grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const planningsByRoom = getPlanningsByRoom(day);

            return (
              <div
                key={day.toISOString()}
                className={classNames(
                  "bg-white rounded-lg shadow p-4",
                  isToday && "ring-2 ring-[#D9A347] ring-offset-2"
                )}
              >
                <div className={classNames(
                  "text-lg font-semibold",
                  isToday ? "text-[#D9A347]" : "text-[#963E56]"
                )}>
                  {format(day, "EEEE", { locale: nl })}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  {format(day, "d MMMM", { locale: nl })}
                </div>

                <div className="space-y-4">
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
                            return (
                              <div
                                key={planning.id}
                                className={classNames(
                                  "text-sm p-2 rounded border border-[#963E56]/10",
                                  planning.isResponsible ? "bg-[#963E56]/10" : "bg-white/50"
                                )}
                              >
                                <div className="font-medium flex items-center gap-1.5">
                                  <span>
                                    {volunteer
                                      ? `${volunteer.firstName} ${volunteer.lastName[0]}.`
                                      : 'Niet toegewezen'
                                    }
                                  </span>
                                  {planning.isResponsible && (
                                    <UserCircle2 className="h-4 w-4 shrink-0 text-[#963E56]" />
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
              </div>
            );
          })}
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-6">
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const planningsByRoom = getPlanningsByRoom(day);

            return (
              <div
                key={day.toISOString()}
                className={classNames(
                  "bg-white rounded-lg shadow p-4",
                  isToday && "ring-2 ring-[#D9A347] ring-offset-2"
                )}
              >
                <div className={classNames(
                  "font-medium text-lg",
                  isToday ? "text-[#D9A347]" : "text-[#963E56]"
                )}>
                  {format(day, "EEEE", { locale: nl })}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  {format(day, "d MMMM", { locale: nl })}
                </div>

                <div className="space-y-4">
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
                            return (
                              <div
                                key={planning.id}
                                className={classNames(
                                  "text-sm p-2 rounded border border-[#963E56]/10",
                                  planning.isResponsible ? "bg-[#963E56]/10" : "bg-white/50"
                                )}
                              >
                                <div className="font-medium flex items-center gap-1.5">
                                  <span>
                                    {volunteer
                                      ? `${volunteer.firstName} ${volunteer.lastName[0]}.`
                                      : 'Niet toegewezen'
                                    }
                                  </span>
                                  {planning.isResponsible && (
                                    <UserCircle2 className="h-4 w-4 shrink-0 text-[#963E56]" />
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
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}