import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, User, House, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/use-socket";
import { FaPray } from "react-icons/fa";
import { PiUsersThree } from "react-icons/pi";

// Hadieth Component - Smaller version
const HadiethCard = () => (
  <Card className="bg-gradient-to-br from-[#963E56]/5 to-transparent border border-[#963E56]/10">
    <CardContent className="p-4">
      <blockquote className="space-y-2">
        <p className="text-base text-[#963E56] leading-relaxed font-medium italic">
          "Houd de rijen recht, want het recht houden van de rijen is deel van het perfect verrichten van het gebed."
        </p>
        <footer className="text-xs text-[#963E56]/80">
          — Overgeleverd door Bukhari & Muslim
        </footer>
      </blockquote>
    </CardContent>
  </Card>
);

// Room type definitie
type Room = {
  id: string;
  title: string;
  status: 'green' | 'red' | 'grey';
};

// Main Component
export default function SufufPage() {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<Record<string, Room>>({
    'first-floor': { id: 'first-floor', title: 'Moskee +1', status: 'grey' },
    'beneden': { id: 'beneden', title: 'Moskee +0', status: 'grey' },
    'garage': { id: 'garage', title: 'Garage', status: 'grey' }
  });
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [okChecked, setOkChecked] = useState(false);
  const [nokChecked, setNokChecked] = useState(false);
  const [isVolunteerSectionOpen, setIsVolunteerSectionOpen] = useState(true);

  useEffect(() => {
    if (!socket) return;

    socket.on('initialStatus', (data: any) => {
      const updatedRooms = { ...rooms };
      Object.entries(data).forEach(([key, value]) => {
        if (updatedRooms[key]) {
          updatedRooms[key].status = value as 'green' | 'red' | 'grey';
        }
      });
      setRooms(updatedRooms);
    });

    socket.on('statusUpdated', (data: { room: string; status: 'green' | 'red' | 'grey' }) => {
      setRooms(prev => ({
        ...prev,
        [data.room]: { ...prev[data.room], status: data.status }
      }));
    });

    return () => {
      socket.off('initialStatus');
      socket.off('statusUpdated');
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !selectedRoom) return;

    // Reset toggles when room changes
    setOkChecked(rooms[selectedRoom].status === 'green');
    setNokChecked(rooms[selectedRoom].status === 'red');
  }, [selectedRoom, rooms]);

  const handleOkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!socket || !selectedRoom) return;

    if (e.target.checked) {
      setNokChecked(false);
      socket.emit('updateStatus', { room: selectedRoom, status: 'OK' });
    } else if (!nokChecked) {
      socket.emit('updateStatus', { room: selectedRoom, status: 'OFF' });
    }
    setOkChecked(e.target.checked);
  };

  const handleNokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!socket || !selectedRoom) return;

    if (e.target.checked) {
      setOkChecked(false);
      socket.emit('updateStatus', { room: selectedRoom, status: 'NOK' });
    } else if (!okChecked) {
      socket.emit('updateStatus', { room: selectedRoom, status: 'OFF' });
    }
    setNokChecked(e.target.checked);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <PiUsersThree className="h-8 w-8 text-[#963E56]" />
        <h1 className="text-2xl md:text-3xl font-bold text-[#963E56]">
          Sufuf (Gebedsrijen)
        </h1>
      </div>

      <HadiethCard />

      {/* Imam Dashboard */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[#963E56] flex items-center gap-2">
          <FaPray className="h-5 w-5" />
          Imam Dashboard
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(rooms).map((room) => (
            <Card
              key={room.id}
              className="overflow-hidden bg-white hover:shadow-lg transition-all duration-300"
            >
              <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-[#963E56]">
                  <House className="h-5 w-5" />
                  {room.title}
                </CardTitle>
                <div className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                  ${room.status === 'green' ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' :
                    room.status === 'red' ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' :
                    'bg-gray-300'
                  }
                `}>
                  {room.status === 'green' && <Check className="w-6 h-6 text-white" />}
                  {room.status === 'red' && <X className="w-6 h-6 text-white" />}
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      room.status === 'green' ? 'w-full bg-green-500' :
                      room.status === 'red' ? 'w-full bg-red-500' :
                      'w-0'
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Vrijwilligers Sectie - Now Collapsible */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-2 text-xl font-semibold text-[#963E56] hover:bg-[#963E56]/5"
          onClick={() => setIsVolunteerSectionOpen(!isVolunteerSectionOpen)}
        >
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span>Vrijwilliger Dashboard</span>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isVolunteerSectionOpen ? 'transform rotate-180' : ''}`} />
        </Button>

        {isVolunteerSectionOpen && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(rooms).map((room) => (
              <Card
                key={room.id}
                className={`
                  overflow-hidden bg-white hover:shadow-lg transition-all duration-300
                  ${selectedRoom === room.id ? 'ring-2 ring-[#963E56] ring-offset-2' : ''}
                `}
                onClick={() => setSelectedRoom(room.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <House className="h-5 w-5 text-[#963E56]" />
                      <span className="font-medium text-[#963E56]">{room.title}</span>
                    </div>
                  </div>
                  {selectedRoom === room.id && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                          <Check className={`w-5 h-5 ${okChecked ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="font-medium text-[#963E56]">OK</span>
                        </div>
                        <label className="relative inline-block w-12 h-6">
                          <input
                            type="checkbox"
                            className="opacity-0 w-0 h-0"
                            checked={okChecked}
                            onChange={handleOkChange}
                          />
                          <span className={`
                            absolute cursor-pointer inset-0 rounded-full transition-all duration-300
                            ${okChecked ? 'bg-green-500' : 'bg-gray-200'}
                          `} />
                          <span className={`
                            absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300
                            ${okChecked ? 'transform translate-x-6' : ''}
                          `} />
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                          <X className={`w-5 h-5 ${nokChecked ? 'text-red-500' : 'text-gray-300'}`} />
                          <span className="font-medium text-[#963E56]">NOK</span>
                        </div>
                        <label className="relative inline-block w-12 h-6">
                          <input
                            type="checkbox"
                            className="opacity-0 w-0 h-0"
                            checked={nokChecked}
                            onChange={handleNokChange}
                          />
                          <span className={`
                            absolute cursor-pointer inset-0 rounded-full transition-all duration-300
                            ${nokChecked ? 'bg-red-500' : 'bg-gray-200'}
                          `} />
                          <span className={`
                            absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300
                            ${nokChecked ? 'transform translate-x-6' : ''}
                          `} />
                        </label>
                      </div>
                      {(okChecked || nokChecked) && (
                        <div className={`mt-4 p-3 rounded-lg border ${
                          okChecked ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                        }`}>
                          <p className={`text-sm ${okChecked ? 'text-green-700' : 'text-red-700'}`}>
                            Doorgegeven aan imam
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}