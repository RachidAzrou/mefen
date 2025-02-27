import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { ref, push, remove, update, onValue } from "firebase/database";
import { UserPlus, Edit2, Trash2, Search, Users, CheckSquare, Square, Settings2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";

const volunteerSchema = z.object({
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  phoneNumber: z.string().min(1, "Telefoonnummer is verplicht"),
});

type Volunteer = z.infer<typeof volunteerSchema> & { id: string };

const ITEMS_PER_PAGE = 10;

type SortOrder = "firstName-asc" | "firstName-desc" | "lastName-asc" | "lastName-desc";

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [deleteVolunteerId, setDeleteVolunteerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<SortOrder>("lastName-asc");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof volunteerSchema>>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
  });

  useEffect(() => {
    const volunteersRef = ref(db, "volunteers");
    const unsubscribe = onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...(volunteer as Omit<Volunteer, "id">),
      })) : [];
      setVolunteers(volunteersList);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    form.reset();
    setEditingVolunteer(null);
  };

  const onSubmit = async (data: z.infer<typeof volunteerSchema>) => {
    try {
      if (editingVolunteer) {
        if (isDuplicateVolunteer(data, editingVolunteer.id)) {
          toast({
            variant: "destructive",
            title: "Fout",
            description: "Deze vrijwilliger bestaat al",
            duration: 3000,
          });
          return;
        }

        await update(ref(db, `volunteers/${editingVolunteer.id}`), data);
        await logUserAction(
          UserActionTypes.VOLUNTEER_UPDATE,
          `Vrijwilliger ${data.firstName} ${data.lastName} bijgewerkt`,
          {
            type: "volunteer",
            id: editingVolunteer.id,
            name: `${data.firstName} ${data.lastName}`
          }
        );
        toast({
          title: "Succes",
          description: "Vrijwilliger succesvol bijgewerkt",
          duration: 3000,
        });
      } else {
        if (isDuplicateVolunteer(data)) {
          toast({
            variant: "destructive",
            title: "Fout",
            description: "Deze vrijwilliger bestaat al",
            duration: 3000,
          });
          return;
        }

        const newVolunteerRef = await push(ref(db, "volunteers"), data);
        await logUserAction(
          UserActionTypes.VOLUNTEER_CREATE,
          `Nieuwe vrijwilliger ${data.firstName} ${data.lastName} toegevoegd`,
          {
            type: "volunteer",
            id: newVolunteerRef.key!,
            name: `${data.firstName} ${data.lastName}`
          }
        );
        toast({
          title: "Succes",
          description: "Vrijwilliger succesvol toegevoegd",
          duration: 3000,
        });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden",
        duration: 3000,
      });
    }
  };

  const isDuplicateVolunteer = (data: z.infer<typeof volunteerSchema>, excludeId?: string) => {
    return volunteers.some(v =>
      v.firstName.toLowerCase() === data.firstName.toLowerCase() &&
      v.lastName.toLowerCase() === data.lastName.toLowerCase() &&
      v.phoneNumber === data.phoneNumber &&
      v.id !== excludeId
    );
  };

  const handleDelete = async (ids: string[]) => {
    try {
      const volunteersToDelete = volunteers.filter(v => ids.includes(v.id));

      for (const volunteer of volunteersToDelete) {
        await remove(ref(db, `volunteers/${volunteer.id}`));
        await logUserAction(
          UserActionTypes.VOLUNTEER_DELETE,
          `Vrijwilliger ${volunteer.firstName} ${volunteer.lastName} verwijderd`,
          {
            type: "volunteer",
            id: volunteer.id,
            name: `${volunteer.firstName} ${volunteer.lastName}`
          }
        );
      }

      toast({
        title: "Succes",
        description: `${ids.length} vrijwilliger(s) succesvol verwijderd`,
        duration: 3000,
      });
      setDeleteVolunteerId(null);
      setSelectedVolunteers([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen",
        duration: 3000,
      });
    }
  };

  const handleBulkAction = () => {
    if (selectedVolunteers.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecteer vrijwilligers",
        description: "Selecteer eerst vrijwilligers om een bulk actie uit te voeren",
        duration: 3000,
      });
      return;
    }
    setDeleteVolunteerId("bulk");
  };

  const handleEdit = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    form.reset({
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      phoneNumber: volunteer.phoneNumber,
    });
    setDialogOpen(true);
  };

  const filteredVolunteers = volunteers.filter(volunteer => {
    const searchString = `${volunteer.firstName} ${volunteer.lastName} ${volunteer.phoneNumber}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const sortedVolunteers = [...filteredVolunteers].sort((a, b) => {
    const [field, direction] = sortOrder.split("-");
    const compareValue = field === "firstName"
      ? a.firstName.localeCompare(b.firstName)
      : a.lastName.localeCompare(b.lastName);
    return direction === "asc" ? compareValue : -compareValue;
  });

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVolunteers = sortedVolunteers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(sortedVolunteers.length / ITEMS_PER_PAGE);

  const toggleSelectAll = () => {
    setSelectedVolunteers(prev =>
      prev.length === paginatedVolunteers.length ? [] : paginatedVolunteers.map(v => v.id)
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedVolunteers(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-[#963E56]" />
        <h1 className="text-3xl font-bold text-[#963E56]">Vrijwilligers</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-[#963E56]/80" />
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Totaal Aantal Vrijwilligers</h3>
              <p className="text-2xl font-bold text-[#963E56]">{volunteers.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Zoeken..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select
            value={sortOrder}
            onValueChange={(value: SortOrder) => setSortOrder(value)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <span>Sorteren op</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="firstName-asc">Voornaam (A-Z)</SelectItem>
              <SelectItem value="firstName-desc">Voornaam (Z-A)</SelectItem>
              <SelectItem value="lastName-asc">Achternaam (A-Z)</SelectItem>
              <SelectItem value="lastName-desc">Achternaam (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Main action button - Add Volunteer or Bulk Action */}
          {selectedVolunteers.length > 0 ? (
            <Button
              className="bg-[#963E56] hover:bg-[#963E56]/90 flex-1 sm:flex-none"
              onClick={handleBulkAction}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Bulk Actie
            </Button>
          ) : (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#963E56] hover:bg-[#963E56]/90 flex-1 sm:flex-none">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Vrijwilliger Toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-[450px] p-4 sm:p-6 bg-white border-none shadow-lg mx-4">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-[#963E56]">
                    {editingVolunteer ? "Vrijwilliger Bewerken" : "Nieuwe Vrijwilliger"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voornaam</FormLabel>
                          <FormControl>
                            <Input placeholder="Voornaam" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Achternaam</FormLabel>
                          <FormControl>
                            <Input placeholder="Achternaam" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefoonnummer</FormLabel>
                          <FormControl>
                            <Input placeholder="Telefoonnummer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Annuleren
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#963E56] hover:bg-[#963E56]/90"
                      >
                        {editingVolunteer ? "Bijwerken" : "Toevoegen"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`${isEditMode ? "bg-[#963E56]/10 text-[#963E56]" : ""}`}
                >
                  <Settings2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEditMode ? "Bewerken afsluiten" : "Lijst bewerken"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {isEditMode && (
                <TableHead className="w-[50px]">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSelectAll}
                    className="hover:bg-transparent"
                  >
                    {selectedVolunteers.length === paginatedVolunteers.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              <TableHead>Voornaam</TableHead>
              <TableHead>Achternaam</TableHead>
              <TableHead>Telefoonnummer</TableHead>
              {isEditMode && <TableHead className="w-[100px]">Acties</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVolunteers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isEditMode ? 5 : 3}
                  className="h-32 text-center text-muted-foreground"
                >
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Geen vrijwilligers gevonden
                </TableCell>
              </TableRow>
            ) : (
              paginatedVolunteers.map((volunteer) => (
                <TableRow key={volunteer.id}>
                  {isEditMode && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSelect(volunteer.id)}
                        className="hover:bg-transparent"
                      >
                        {selectedVolunteers.includes(volunteer.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell>{volunteer.firstName}</TableCell>
                  <TableCell>{volunteer.lastName}</TableCell>
                  <TableCell>{volunteer.phoneNumber}</TableCell>
                  {isEditMode && (
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(volunteer)}
                          className="text-[#963E56] hover:text-[#963E56] hover:bg-[#963E56]/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteVolunteerId(volunteer.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {currentPage} van {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bulk Actions */}
      {isEditMode && selectedVolunteers.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 flex items-center gap-3 bg-white p-4 rounded-lg shadow-lg border animate-in slide-in-from-bottom-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {selectedVolunteers.length} geselecteerd
          </span>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <Button
            variant="destructive"
            onClick={() => handleBulkAction()}
            className="w-full sm:w-auto bg-[#963E56] hover:bg-[#963E56]/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Verwijderen
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteVolunteerId}
        onOpenChange={() => setDeleteVolunteerId(null)}
      >
        <AlertDialogContent className="max-w-[95vw] sm:max-w-[450px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteVolunteerId === "bulk"
                ? `Je staat op het punt om ${selectedVolunteers.length} vrijwilliger(s) te verwijderen. Deze actie kan niet ongedaan worden gemaakt.`
                : "Deze actie kan niet ongedaan worden gemaakt. Dit zal de vrijwilliger permanent verwijderen."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteVolunteerId(null)}>
              Annuleren
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVolunteerId === "bulk"
                ? handleDelete(selectedVolunteers)
                : deleteVolunteerId && handleDelete([deleteVolunteerId])
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}