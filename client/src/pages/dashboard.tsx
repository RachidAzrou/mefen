import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { LayoutGrid, Users, Package2, CheckCircle2, DoorOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WeekView } from "@/components/calendar/week-view";
import { format, parseISO, isWithinInterval, startOfToday, endOfToday } from "date-fns";

type Material = {
  id: string;
  typeId: string;
  number: number;
  volunteerId: string;
  isCheckedOut: boolean;
};

type MaterialType = {
  id: string;
  name: string;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
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

export default function Dashboard() {
  const [checkedOutMaterials, setCheckedOutMaterials] = useState<Material[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<'materials' | 'volunteers' | 'active' | 'rooms' | null>(null);

  useEffect(() => {
    const materialsRef = ref(db, "materials");
    const volunteersRef = ref(db, "volunteers");
    const materialTypesRef = ref(db, "materialTypes");
    const roomsRef = ref(db, "rooms");
    const planningsRef = ref(db, "plannings");

    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      const materialsList = data ? Object.entries(data)
        .map(([id, material]: [string, any]) => ({
          id,
          ...material
        }))
        .filter((material: Material) => material.isCheckedOut) : [];
      setCheckedOutMaterials(materialsList);
    });

    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data)
        .map(([id, volunteer]: [string, any]) => ({
          id,
          ...volunteer
        })) : [];
      setVolunteers(volunteersList);
    });

    onValue(materialTypesRef, (snapshot) => {
      const data = snapshot.val();
      const typesList = data ? Object.entries(data)
        .map(([id, type]: [string, any]) => ({
          id,
          ...type
        })) : [];
      setMaterialTypes(typesList);
    });

    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data)
        .map(([id, room]: [string, any]) => ({
          id,
          ...room
        })) : [];
      setRooms(roomsList);
    });

    onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data)
        .map(([id, planning]: [string, any]) => ({
          id,
          ...planning
        })) : [];
      setPlannings(planningsList);
    });
  }, []);

  // Get unique volunteers active today (have a planning for today)
  const activeVolunteers = volunteers.filter(volunteer => {
    const today = new Date();
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    return plannings.some(planning => {
      const planningStart = parseISO(planning.startDate);
      const planningEnd = parseISO(planning.endDate);

      return planning.volunteerId === volunteer.id && 
             isWithinInterval(today, { 
               start: planningStart,
               end: planningEnd 
             });
    });
  });

  // Get all plannings for today
  const todayPlannings = plannings.filter(planning => {
    const today = new Date();
    const planningStart = parseISO(planning.startDate);
    const planningEnd = parseISO(planning.endDate);

    return isWithinInterval(today, { 
      start: planningStart,
      end: planningEnd 
    });
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">Dashboard</h1>
      </div>

      {/* Statistics Blocks - Above the calendar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('materials')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Uitgeleende Materialen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package2 className="h-8 w-8 text-[#963E56]" />
                <div className="ml-2 sm:ml-3">
                  <div className="text-lg sm:text-2xl font-bold">{checkedOutMaterials.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">materialen</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('volunteers')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Totaal Vrijwilligers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-[#963E56]" />
                <div className="ml-2 sm:ml-3">
                  <div className="text-lg sm:text-2xl font-bold">{volunteers.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">vrijwilligers</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('rooms')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Totaal Ruimtes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DoorOpen className="h-8 w-8 text-[#963E56]" />
                <div className="ml-2 sm:ml-3">
                  <div className="text-lg sm:text-2xl font-bold">{rooms.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">ruimtes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('active')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Actieve Vrijwilligers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle2 className="h-8 w-8 text-[#963E56]" />
                <div className="ml-2 sm:ml-3">
                  <div className="text-lg sm:text-2xl font-bold">{activeVolunteers.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">vandaag actief</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={selectedBlock !== null} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              {selectedBlock === 'materials' && <Package2 className="h-6 w-6 text-[#963E56]" />}
              {selectedBlock === 'volunteers' && <Users className="h-6 w-6 text-[#963E56]" />}
              {selectedBlock === 'active' && <CheckCircle2 className="h-6 w-6 text-[#963E56]" />}
              {selectedBlock === 'rooms' && <DoorOpen className="h-6 w-6 text-[#963E56]" />}
              <DialogTitle className="text-lg font-semibold text-[#963E56]">
                {selectedBlock === 'materials' && 'Uitgeleende Materialen'}
                {selectedBlock === 'volunteers' && 'Alle Vrijwilligers'}
                {selectedBlock === 'active' && 'Actieve Vrijwilligers Vandaag'}
                {selectedBlock === 'rooms' && 'Alle Ruimtes'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-lg border bg-card">
            {selectedBlock === 'materials' && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Nummer</TableHead>
                    <TableHead className="font-semibold">Uitgeleend aan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedOutMaterials.map(material => {
                    const type = materialTypes.find(t => t.id === material.typeId);
                    const volunteer = volunteers.find(v => v.id === material.volunteerId);
                    return (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{type?.name || 'Onbekend'}</TableCell>
                        <TableCell>#{material.number}</TableCell>
                        <TableCell>
                          {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Onbekend'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {checkedOutMaterials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Geen uitgeleende materialen
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            {selectedBlock === 'volunteers' && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Naam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteers.map(volunteer => (
                    <TableRow key={volunteer.id}>
                      <TableCell className="font-medium">
                        {volunteer.firstName} {volunteer.lastName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {selectedBlock === 'active' && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Naam</TableHead>
                    <TableHead className="font-semibold">Ruimte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayPlannings.map(planning => {
                    const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                    const room = rooms.find(r => r.id === planning.roomId);
                    return (
                      <TableRow key={planning.id}>
                        <TableCell className="font-medium">
                          {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Onbekend'}
                        </TableCell>
                        <TableCell>
                          {room?.name || 'Onbekende ruimte'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {todayPlannings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        Geen actieve vrijwilligers vandaag
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            {selectedBlock === 'rooms' && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Naam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map(room => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <WeekView checkedOutMaterials={checkedOutMaterials.length} />
      </div>
    </div>
  );
}