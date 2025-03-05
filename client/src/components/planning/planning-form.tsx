import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Check, Search, X, UserCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface PlanningFormProps {
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; responsible?: string; }[];
  onSubmit: (data: z.infer<typeof planningSchema>) => Promise<void>;
  onClose: () => void;
  form: UseFormReturn<z.infer<typeof planningSchema>>;
  editingPlanning: any | null;
  plannings: any[];
}

export function PlanningForm({
  volunteers,
  rooms,
  onSubmit,
  onClose,
  form,
  editingPlanning,
  plannings
}: PlanningFormProps) {
  const { toast } = useToast();
  const isBulkPlanning = form.watch("isBulkPlanning");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTermBulk, setSearchTermBulk] = useState("");
  const selectedRoomId = form.watch("roomId");
  const isResponsible = form.watch("isResponsible");
  const [showResponsibleAlert, setShowResponsibleAlert] = useState(false);
  const [currentResponsible, setCurrentResponsible] = useState<any>(null);

  useEffect(() => {
    if (selectedRoomId && isResponsible) {
      const currentResponsiblePlanning = plannings.find(
        p => p.roomId === selectedRoomId && p.isResponsible
      );

      if (currentResponsiblePlanning) {
        const responsible = volunteers.find(v => v.id === currentResponsiblePlanning.volunteerId);
        if (responsible) {
          setCurrentResponsible(responsible);
          setShowResponsibleAlert(true);
          return;
        }
      }
    }
  }, [selectedRoomId, isResponsible, plannings, volunteers]);

  const handleFormSubmit = async (data: z.infer<typeof planningSchema>) => {
    try {
      await onSubmit(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {!editingPlanning && (
          <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-border">
            <Switch
              checked={isBulkPlanning}
              onCheckedChange={(checked) => {
                form.setValue("isBulkPlanning", checked);
                if (!checked) {
                  form.setValue("selectedVolunteers", []);
                  form.setValue("selectedRooms", []);
                }
                form.setValue("volunteerId", undefined);
                form.setValue("roomId", undefined);
                form.setValue("isResponsible", false);
              }}
              className="data-[state=checked]:bg-[#963E56]"
            />
            <Label className="text-sm">Bulk Inplannen</Label>
          </div>
        )}

        {!isBulkPlanning && (
          <>
            <FormField
              control={form.control}
              name="volunteerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Vrijwilliger</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecteer vrijwilliger" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="sticky top-0 p-2 bg-white border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Zoek vrijwilliger..."
                            value={searchTerm}
                            onKeyDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.preventDefault();
                              setSearchTerm(e.target.value);
                            }}
                            className="pl-9 h-9"
                          />
                        </div>
                      </div>
                      <div className="pt-1">
                        {volunteers
                          .filter(volunteer => {
                            const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
                            return fullName.includes(searchTerm.toLowerCase());
                          })
                          .map((volunteer) => (
                            <SelectItem
                              key={volunteer.id}
                              value={volunteer.id}
                              className="flex items-center py-2 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Check
                                  className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    field.value === volunteer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="flex-grow truncate">{volunteer.firstName} {volunteer.lastName}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </div>
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <div className="mt-2 space-y-2">
                      {(() => {
                        const volunteer = volunteers.find(v => v.id === field.value);
                        if (volunteer) {
                          return (
                            <>
                              <div className="bg-[#963E56]/10 text-[#963E56] text-sm rounded-full px-3 py-1 flex items-center gap-2 w-fit">
                                <span>{volunteer.firstName} {volunteer.lastName}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                  onClick={() => field.onChange(undefined)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <FormField
                                control={form.control}
                                name="isResponsible"
                                render={({ field: responsibleField }) => (
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={responsibleField.value}
                                      onCheckedChange={responsibleField.onChange}
                                      className="data-[state=checked]:bg-[#963E56]"
                                    />
                                    <Label className="text-sm flex items-center gap-1">
                                      <UserCircle2 className="h-4 w-4" />
                                      Verantwoordelijke
                                    </Label>
                                  </div>
                                )}
                              />
                            </>
                          );
                        }
                      })()}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Ruimte</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      // Check if room already has a responsible volunteer
                      const room = rooms.find(r => r.id === value);
                      
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecteer een ruimte" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem
                          key={room.id}
                          value={room.id}
                          className="cursor-pointer py-2.5 px-3 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                field.value === room.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="flex-grow">{room.name}</span>
                            {room.responsible && (
                              <div className="text-xs text-muted-foreground">
                                (Heeft al een verantwoordelijke)
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {isBulkPlanning && (
          <>
            <FormField
              control={form.control}
              name="selectedVolunteers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Vrijwilligers</FormLabel>
                  <Select
                    value={field.value?.[0] || ""}
                    onValueChange={(value) => {
                      const current = field.value || [];
                      const updated = current.includes(value)
                        ? current.filter(id => id !== value)
                        : [...current, value];
                      field.onChange(updated);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecteer vrijwilligers">
                        {field.value?.length
                          ? `${field.value.length} vrijwilliger(s) geselecteerd`
                          : "Selecteer vrijwilligers"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="sticky top-0 p-2 bg-white border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Zoek vrijwilliger..."
                            value={searchTermBulk}
                            onKeyDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.preventDefault();
                              setSearchTermBulk(e.target.value);
                            }}
                            className="pl-9 h-9"
                          />
                        </div>
                      </div>
                      <div className="pt-1">
                        {volunteers
                          .filter(volunteer => {
                            const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
                            return fullName.includes(searchTermBulk.toLowerCase());
                          })
                          .map((volunteer) => (
                            <SelectItem
                              key={volunteer.id}
                              value={volunteer.id}
                              className="flex items-center py-2 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Check
                                  className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    field.value?.includes(volunteer.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="flex-grow truncate">{volunteer.firstName} {volunteer.lastName}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </div>
                    </SelectContent>
                  </Select>
                  {field.value?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {field.value.map(id => {
                        const volunteer = volunteers.find(v => v.id === id);
                        return volunteer && (
                          <div
                            key={id}
                            className="bg-[#963E56]/10 text-[#963E56] text-sm rounded-full px-3 py-1 flex items-center gap-2"
                          >
                            <span>{volunteer.firstName} {volunteer.lastName}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                field.onChange(field.value?.filter(v => v !== id));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedRooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Ruimtes</FormLabel>
                  <Select
                    value={field.value?.[0] || ""}
                    onValueChange={(value) => {
                      const current = field.value || [];
                      const updated = current.includes(value)
                        ? current.filter(id => id !== value)
                        : [...current, value];
                      field.onChange(updated);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder="Selecteer ruimtes"
                      >
                        {field.value?.length
                          ? `${field.value.length} ruimte(s) geselecteerd`
                          : "Selecteer ruimtes"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem
                          key={room.id}
                          value={room.id}
                          className="flex items-center py-2 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Check
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                field.value?.includes(room.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="flex-grow truncate">{room.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {field.value.map(id => {
                        const room = rooms.find(r => r.id === id);
                        return room && (
                          <div
                            key={id}
                            className="bg-[#963E56]/10 text-[#963E56] text-sm rounded-full px-3 py-1 flex items-center gap-2"
                          >
                            <span>{room.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                field.onChange(field.value?.filter(r => r !== id));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Startdatum</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "d MMM yyyy", { locale: nl })
                        ) : (
                          <span>Kies een datum</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                          const dateStr = format(utcDate, 'yyyy-MM-dd');
                          field.onChange(dateStr);
                        }
                      }}
                      initialFocus
                      locale={nl}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Einddatum</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "d MMM yyyy", { locale: nl })
                        ) : (
                          <span>Kies een datum</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                          const dateStr = format(utcDate, 'yyyy-MM-dd');
                          field.onChange(dateStr);
                        }
                      }}
                      disabled={(date) => {
                        const startDate = form.getValues("startDate");
                        if (!startDate) return true;
                        return date < new Date(startDate);
                      }}
                      initialFocus
                      locale={nl}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <AlertDialog open={showResponsibleAlert} onOpenChange={setShowResponsibleAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Verantwoordelijke wijzigen</AlertDialogTitle>
              <AlertDialogDescription>
                {currentResponsible && (
                  <>
                    Deze ruimte heeft al een verantwoordelijke: 
                    <span className="font-medium text-[#963E56]">
                      {` ${currentResponsible.firstName} ${currentResponsible.lastName}`}
                    </span>
                    . Wil je deze vervangen?
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                form.setValue("isResponsible", false);
                setShowResponsibleAlert(false);
              }}>
                Annuleren
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => setShowResponsibleAlert(false)}>
                Doorgaan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-sm"
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            className="bg-[#963E56] hover:bg-[#963E56]/90 text-sm"
          >
            {editingPlanning ? "Planning Bijwerken" : "Planning Opslaan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}