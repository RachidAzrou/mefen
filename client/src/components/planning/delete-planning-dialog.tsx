import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CalendarIcon, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const deleteFormSchema = z.object({
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  selectedVolunteers: z.array(z.string()).default([]),
  selectedRooms: z.array(z.string()).default([]),
});

type DeleteFormData = z.infer<typeof deleteFormSchema>;

interface DeletePlanningDialogProps {
  volunteers: { id: string; firstName: string; lastName: string }[];
  rooms: { id: string; name: string }[];
  onDelete: (data: DeleteFormData) => Promise<void>;
  onClose: () => void;
}

export function DeletePlanningDialog({
  volunteers,
  rooms,
  onDelete,
  onClose,
}: DeletePlanningDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<DeleteFormData>({
    resolver: zodResolver(deleteFormSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      selectedVolunteers: [],
      selectedRooms: [],
    },
  });

  const handleSubmit = async (data: DeleteFormData) => {
    try {
      setIsDeleting(true);
      await onDelete(data);
      onClose();
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVolunteers = volunteers.filter((volunteer) =>
    `${volunteer.firstName} ${volunteer.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="selectedVolunteers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vrijwilligers</FormLabel>
              <Command className="rounded-lg border shadow-md">
                <CommandInput
                  placeholder="Zoek vrijwilligers..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandEmpty>Geen vrijwilligers gevonden.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-auto">
                  {filteredVolunteers.map((volunteer) => (
                    <CommandItem
                      key={volunteer.id}
                      onSelect={() => {
                        const current = field.value || [];
                        const updated = current.includes(volunteer.id)
                          ? current.filter((id) => id !== volunteer.id)
                          : [...current, volunteer.id];
                        field.onChange(updated);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          field.value?.includes(volunteer.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {volunteer.firstName} {volunteer.lastName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="selectedRooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ruimtes</FormLabel>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Zoek ruimtes..." />
                <CommandEmpty>Geen ruimtes gevonden.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-auto">
                  {rooms.map((room) => (
                    <CommandItem
                      key={room.id}
                      onSelect={() => {
                        const current = field.value || [];
                        const updated = current.includes(room.id)
                          ? current.filter((id) => id !== room.id)
                          : [...current, room.id];
                        field.onChange(updated);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          field.value?.includes(room.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {room.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
              <FormMessage />
            </FormItem>
          )}
        />

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
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? (
                        format(parseISO(field.value), "EEEE d MMMM yyyy", {
                          locale: nl,
                        })
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
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(format(date, "yyyy-MM-dd"));
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
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? (
                        format(parseISO(field.value), "EEEE d MMMM yyyy", {
                          locale: nl,
                        })
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
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(format(date, "yyyy-MM-dd"));
                      }
                    }}
                    disabled={(date) => {
                      const startDate = form.getValues("startDate");
                      if (!startDate) return true;
                      const minDate = parseISO(startDate);
                      minDate.setHours(0, 0, 0, 0);
                      date.setHours(0, 0, 0, 0);
                      return date < minDate;
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

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="bg-[#963E56] hover:bg-[#963E56]/90"
            disabled={isDeleting}
          >
            {isDeleting ? "Bezig met verwijderen..." : "Planning verwijderen"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
