import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Edit2, Settings2 } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { db } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GiWalkieTalkie } from "react-icons/gi";

type Room = {
  id: string;
  name: string;
  channel?: string;
};

export default function Communication() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const roomsRef = ref(db, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]: [string, any]) => ({
        id,
        ...room
      })) : [];
      setRooms(roomsList);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateChannel = async (roomId: string, channel: string) => {
    try {
      await update(ref(db, `rooms/${roomId}`), {
        channel
      });
      toast({
        title: "Kanaal bijgewerkt",
        description: "Het walkietalkie kanaal is succesvol bijgewerkt.",
        duration: 3000,
      });
      setDialogOpen(false);
      setNewChannel("");
      setEditingRoom(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden bij het bijwerken van het kanaal.",
        duration: 3000,
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Radio className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">
          Communicatie
        </h1>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <GiWalkieTalkie className="h-5 w-5 sm:h-8 sm:w-8 text-[#963E56]/80" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Walkietalkie Kanalen
              </p>
              <p className="text-lg sm:text-2xl font-bold text-[#963E56]">
                {rooms.filter(r => r.channel).length} / {rooms.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Mode Toggle */}
      <div className="flex justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsEditMode(!isEditMode)}
                className={isEditMode ? "bg-[#963E56]/10 text-[#963E56]" : ""}
              >
                <Settings2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isEditMode ? "Bewerken afsluiten" : "Kanalen bewerken"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[#963E56]/10 rounded-full p-2">
                    <GiWalkieTalkie className="h-5 w-5 sm:h-6 sm:w-6 text-[#963E56]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#963E56]">{room.name}</h3>
                </div>
                {isEditMode && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingRoom(room);
                            setNewChannel(room.channel || "");
                            setDialogOpen(true);
                          }}
                          className="text-[#963E56] hover:text-[#963E56]/90 hover:bg-[#963E56]/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bewerken</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="mt-6">
                <div className="text-3xl sm:text-4xl font-bold">
                  {room.channel || "-"}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Kanaal nummer
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingRoom(null);
          setNewChannel("");
        }
        setDialogOpen(open);
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[450px] p-4 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#963E56]">
              Kanaal Bewerken
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Ruimte
              </label>
              <div className="p-2 bg-muted/50 rounded-md">
                {editingRoom?.name}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Walkietalkie Kanaal
              </label>
              <Input
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="Voer kanaalnummer in"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingRoom(null);
                  setNewChannel("");
                }}
              >
                Annuleren
              </Button>
              <Button
                onClick={() => editingRoom && handleUpdateChannel(editingRoom.id, newChannel)}
                className="bg-[#963E56] hover:bg-[#963E56]/90"
              >
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}