import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Search, X, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Schema definition
const planningSchema = z.discriminatedUnion("isBulkPlanning", [
  z.object({
    isBulkPlanning: z.literal(false),
    volunteerId: z.string().min(1, "Selecteer een vrijwilliger"),
    roomId: z.string().min(1, "Selecteer een ruimte"),
    startDate: z.string().min(1, "Startdatum is verplicht"),
    endDate: z.string().min(1, "Einddatum is verplicht"),
    isResponsible: z.boolean().default(false),
  }),
  z.object({
    isBulkPlanning: z.literal(true),
    selectedVolunteers: z.array(z.string()).min(1, "Selecteer ten minste één vrijwilliger"),
    selectedRoomId: z.string().min(1, "Selecteer een ruimte"),
    startDate: z.string().min(1, "Startdatum is verplicht"),
    endDate: z.string().min(1, "Einddatum is verplicht"),
    responsibleVolunteerId: z.string().optional(),
  }),
]);

type PlanningFormData = z.infer<typeof planningSchema>;

interface Planning {
  id: string;
  volunteerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  isResponsible?: boolean;
}

interface PlanningFormProps {
  volunteers: { id: string; firstName: string; lastName: string }[];
  rooms: { id: string; name: string }[];
  onSubmit: (data: PlanningFormData) => Promise<void>;
  onClose: () => void;
  form: UseFormReturn<PlanningFormData>;
  editingPlanning: Planning | null;
}

const PlanningForm: React.FC<PlanningFormProps> = ({
  volunteers,
  rooms,
  onSubmit,
  onClose,
  form,
  editingPlanning
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isBulkPlanning = form.watch("isBulkPlanning");
  const selectedVolunteers = form.watch("selectedVolunteers") || [];

  const handleFormSubmit = async (data: PlanningFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het opslaan van de planning",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVolunteerName = (id: string) => {
    const volunteer = volunteers.find(v => v.id === id);
    return volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "";
  };

  const filteredVolunteers = volunteers.filter(volunteer => {
    const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {!editingPlanning && (
          <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-border">
            <Switch
              checked={isBulkPlanning}
              onCheckedChange={(checked) => {
                form.reset(checked ? {
                  isBulkPlanning: true,
                  selectedVolunteers: [],
                  selectedRoomId: "",
                  startDate: "",
                  endDate: "",
                  responsibleVolunteerId: undefined,
                } : {
                  isBulkPlanning: false,
                  volunteerId: "",
                  roomId: "",
                  startDate: "",
                  endDate: "",
                  isResponsible: false,
                } as PlanningFormData);
              }}
              className="data-[state=checked]:bg-[#963E56]"
            />
            <Label className="text-sm">Bulk Inplannen</Label>
          </div>
        )}

        {/* Ruimte selectie */}
        <FormField
          control={form.control}
          name={isBulkPlanning ? "selectedRoomId" : "roomId"}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Ruimte</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een ruimte">
                    {field.value && rooms.find(r => r.id === field.value)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent side="bottom">
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      <span>{room.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Vrijwilliger selectie */}
        <FormField
          control={form.control}
          name={isBulkPlanning ? "selectedVolunteers" : "volunteerId"}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">
                Vrijwilliger{isBulkPlanning ? 's' : ''}
              </FormLabel>
              <Select
                value={isBulkPlanning ? field.value?.[0] || "" : field.value}
                onValueChange={(value) => {
                  if (isBulkPlanning) {
                    const current = field.value || [];
                    const updated = current.includes(value)
                      ? current.filter(id => id !== value)
                      : [...current, value];
                    field.onChange(updated);
                  } else {
                    field.onChange(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecteer vrijwilliger${isBulkPlanning ? 's' : ''}`}>
                    {isBulkPlanning
                      ? field.value?.length > 0
                        ? `${field.value.length} vrijwilliger(s) geselecteerd`
                        : null
                      : field.value
                        ? getVolunteerName(field.value)
                        : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  align="start"
                  className="h-[300px]"
                >
                  <div className="sticky top-0 bg-white p-2 border-b z-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Zoek vrijwilliger..."
                        value={searchTerm}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSearchTerm(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="pt-1">
                    {filteredVolunteers.map((volunteer) => (
                      <SelectItem
                        key={volunteer.id}
                        value={volunteer.id}
                      >
                        <span>{volunteer.firstName} {volunteer.lastName}</span>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              {isBulkPlanning && field.value?.length > 0 && (
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
                            const newValue = field.value?.filter(v => v !== id);
                            field.onChange(newValue);
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

        {/* Verantwoordelijke sectie voor bulk planning */}
        {isBulkPlanning ? (
          selectedVolunteers.length > 0 && (
            <FormField
              control={form.control}
              name="responsibleVolunteerId"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm">
                    <div className="flex items-center gap-2">
                      <span>Verantwoordelijke</span>
                      <div className="bg-[#963E56]/10 rounded-full p-1">
                        <ShieldCheck className="h-4 w-4 text-[#963E56]" />
                      </div>
                    </div>
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      {selectedVolunteers.map((volunteerId) => {
                        const volunteer = volunteers.find(v => v.id === volunteerId);
                        return volunteer && (
                          <FormItem
                            key={volunteerId}
                            className="flex items-center space-x-3 space-y-0"
                          >
                            <FormControl>
                              <RadioGroupItem value={volunteerId} />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {volunteer.firstName} {volunteer.lastName}
                            </FormLabel>
                          </FormItem>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )
        ) : (
          <FormField
            control={form.control}
            name="isResponsible"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <FormLabel>Verantwoordelijke</FormLabel>
                  <div className="bg-[#963E56]/10 rounded-full p-1">
                    <ShieldCheck className="h-4 w-4 text-[#963E56]" />
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-[#963E56]"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Datum selectie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
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
                          field.onChange(format(date, 'yyyy-MM-dd'));
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
              <FormItem>
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
                          field.onChange(format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      disabled={(date) => {
                        const startDate = form.getValues("startDate");
                        if (!startDate) return false;
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
            className="bg-[#963E56] hover:bg-[#963E56]/90 text-sm text-white"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Opslaan..."
              : editingPlanning
                ? "Planning Bijwerken"
                : "Planning Opslaan"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export type { Planning, PlanningFormData };
export { planningSchema };
export default PlanningForm;