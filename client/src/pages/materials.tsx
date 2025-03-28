import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { ref, push, remove, update, onValue } from "firebase/database";
import {
  Package2,
  Search,
  Plus,
  X,
  Settings2,
  RotateCcw,
  CheckSquare,
  Square,
  Edit2,
  Flashlight,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";
import { cn } from "@/lib/utils";
import { GiMonclerJacket, GiWalkieTalkie } from "react-icons/gi";
import { TbJacket } from "react-icons/tb";
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';


const materialSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht"),
  materials: z
    .array(
      z.object({
        typeId: z.string().min(1, "Type materiaal is verplicht"),
        numbers: z.array(z.number().min(1).max(100)),
      }),
    )
    .min(1, "Selecteer ten minste één materiaal"),
});

const materialTypeSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  maxCount: z.coerce
    .number()
    .min(1, "Minimaal 1 vereist")
    .max(100, "Maximaal 100 toegestaan"),
});

type MaterialType = {
  id: string;
  name: string;
  maxCount: number;
};

type Material = {
  id: string;
  typeId: string;
  number: number;
  volunteerId?: string;
  isCheckedOut: boolean;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
};

const getMaterialIcon = (materialName: string) => {
  const name = materialName.toLowerCase();
  if (name.includes("jas"))
    return <GiMonclerJacket className="h-8 w-8 text-primary/80" />;
  if (name.includes("hesje"))
    return <TbJacket className="h-8 w-8 text-primary/80" />;
  if (name.includes("lamp"))
    return <Flashlight className="h-8 w-8 text-primary/80" />;
  if (name.includes("walkie"))
    return <GiWalkieTalkie className="h-8 w-8 text-primary/80" />;
  return <Package2 className="h-8 w-8 text-primary/80" />;
};

const PlanningSection = ({ title, children }: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#963E56]">{title}</h2>
      {children}
    </div>
  );
};

const Materials = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>(
    [],
  );
  const [isTypesDialogOpen, setIsTypesDialogOpen] = useState(false);
  const [editingMaterialType, setEditingMaterialType] =
    useState<MaterialType | null>(null);
  const [deleteMaterialTypeId, setDeleteMaterialTypeId] = useState<
    string | null
  >(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [searchReturned, setSearchReturned] = useState("");
  const [returnedMaterials, setReturnedMaterials] = useState<Array<{
    id: string;
    materialType: string;
    number: number;
    borrower: string;
    borrowDate: string;
    returnDate: string;
  }>>([]);
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");
  const [materialNumber, setMaterialNumber] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string | null>(null);

  const form = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      volunteerId: "",
      materials: [],
    },
  });

  const typeForm = useForm<z.infer<typeof materialTypeSchema>>({
    resolver: zodResolver(materialTypeSchema),
    defaultValues: {
      name: "",
      maxCount: 1,
    },
  });

  useEffect(() => {
    const materialTypesRef = ref(db, "materialTypes");
    onValue(materialTypesRef, (snapshot) => {
      const data = snapshot.val();
      const typesList = data
        ? Object.entries(data).map(([id, type]) => ({
            id,
            ...(type as Omit<MaterialType, "id">),
          }))
        : [];
      setMaterialTypes(typesList);
    });

    const materialsRef = ref(db, "materials");
    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      const materialsList = data
        ? Object.entries(data).map(([id, material]) => ({
            id,
            ...(material as Omit<Material, "id">),
          }))
        : [];
      setMaterials(materialsList);
    });

    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data
        ? Object.entries(data).map(([id, volunteer]) => ({
            id,
            ...(volunteer as Omit<Volunteer, "id">),
          }))
        : [];
      setVolunteers(volunteersList);
    });
  }, []);

  const logActivity = async (
    action: "checkout" | "return",
    material: Material,
    volunteerId: string,
  ) => {
    try {
      await push(ref(db, "activityLogs"), {
        action,
        materialTypeId: material.typeId,
        materialNumber: material.number,
        volunteerId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  const checkForCheckedOutMaterials = (materials: Material[], selectedMaterials: any[]) => {
    return selectedMaterials.some(material => 
      material.numbers.some(number => 
        materials.some(m => 
          m.typeId === material.typeId && 
          m.number === number && 
          m.isCheckedOut
        )
      )
    );
  };

  const onSubmit = async (data: z.infer<typeof materialSchema>) => {
    try {
      setFormError(null);
      const hasCheckedOutMaterials = checkForCheckedOutMaterials(materials, data.materials);

      if (hasCheckedOutMaterials) {
        setFormError("Sorry maar één of meerdere geselecteerde materialen zijn alreeds uitgeleend");
        return false;
      }

      const volunteer = volunteers.find((v) => v.id === data.volunteerId);

      const createPromises = data.materials.flatMap((material) => {
        const materialType = materialTypes.find(
          (t) => t.id === material.typeId,
        );

        return material.numbers.map(async (number) => {
          await push(ref(db, "materials"), {
            typeId: material.typeId,
            volunteerId: data.volunteerId,
            number,
            isCheckedOut: true,
          });

          await logUserAction(
            UserActionTypes.MATERIAL_CHECKOUT,
            `${materialType?.name || "Materiaal"} #${number} uitgeleend aan ${
              volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "onbekende vrijwilliger"
            }`,
            {
              type: "material",
              name: materialType?.name || "Onbekend materiaal",
              materialNumber: number.toString(),
              volunteerName: volunteer
                ? `${volunteer.firstName} ${volunteer.lastName}`
                : undefined,
            },
          );
        });
      });

      await Promise.all(createPromises);

      const totalItems = data.materials.reduce(
        (sum, material) => sum + material.numbers.length,
        0,
      );

      if (totalItems > 0) {
        toast({
          title: "Succes",
          description: `${totalItems} materialen succesvol toegewezen aan ${volunteer?.firstName} ${volunteer?.lastName}`,
          duration: 3000,
        });

        form.reset();
        setSelectedMaterialTypes([]);
        setFormError(null);
        setDialogOpen(false);
      }

      return true; 
    } catch (error) {
      setFormError("Er is een fout opgetreden bij het toewijzen van materialen");
      return false; 
    }
  };

  const onSubmitType = async (data: z.infer<typeof materialTypeSchema>) => {
    try {
      if (editingMaterialType) {
        await update(ref(db, `materialTypes/${editingMaterialType.id}`), data);
        await logUserAction(
          UserActionTypes.MATERIAL_TYPE_UPDATE,
          `Materiaaltype ${data.name} bijgewerkt`,
          {
            type: "material",
            id: editingMaterialType.id,
            name: data.name,
          },
        );
        toast({
          title: "Succes",
          description: "Materiaaltype succesvol bijgewerkt",
          duration: 3000,
        });
        setEditingMaterialType(null);
      } else {
        const newTypeRef = await push(ref(db, "materialTypes"), data);
        await logUserAction(
          UserActionTypes.MATERIAL_TYPE_CREATE,
          `Nieuw materiaaltype ${data.name} aangemaakt`,
          {
            type: "material",
            id: newTypeRef.key!,
            name: data.name,
          },
        );
        toast({
          title: "Succes",
          description: "Materiaaltype succesvol toegevoegd",
          duration: 3000,
        });
      }
      typeForm.reset();
      setIsTypesDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaaltype niet opslaan",
        duration: 3000,
      });
    }
  };

  const handleDeleteMaterialType = async (id: string) => {
    try {
      const materialType = materialTypes.find((t) => t.id === id);
      if (!materialType) return;

      await remove(ref(db, `materialTypes/${id}`));
      await logUserAction(
        UserActionTypes.MATERIAL_TYPE_DELETE,
        `Materiaaltype ${materialType.name} verwijderd`,
        {
          type: "material",
          id: id,
          name: materialType.name,
        },
      );
      toast({
        title: "Succes",
        description: "Materiaaltype succesvol verwijderd",
        duration: 3000,
      });
      setDeleteMaterialTypeId(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaaltype niet verwijderen",
        duration: 3000,
      });
    }
  };

  const handleReturn = async (materialId: string) => {
    try {
      const material = materials.find((m) => m.id === materialId);
      if (!material) return;

      const materialType = materialTypes.find((t) => t.id === material.typeId);
      const volunteer = volunteers.find((v) => v.id === material.volunteerId);

      await update(ref(db, `materials/${materialId}`), {
        volunteerId: null,
        isCheckedOut: false,
      });

      await push(ref(db, "activityLogs"), {
        action: "return",
        materialTypeId: material.typeId,
        materialNumber: material.number,
        volunteerId: material.volunteerId,
        timestamp: new Date().toISOString(),
        originalCheckoutDate: material.isCheckedOut ? new Date().toISOString() : null,
      });

      await logUserAction(
        UserActionTypes.MATERIAL_RETURN,
        `${materialType?.name || "Materiaal"} #${material.number} geretourneerd van ${volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "onbekende vrijwilliger"}`,
        {
          type: "material",
          id: material.id,
          name: materialType?.name || "Onbekend materiaal",
          materialNumber: material.number.toString(),
          volunteerName: volunteer
            ? `${volunteer.firstName} ${volunteer.lastName}`
            : undefined,
        },
      );

      toast({
        title: "Materiaal Geretourneerd",
        description: "Het materiaal is succesvol geretourneerd",
        duration: 3000,
        variant: "success",
      });
    } catch (error) {
      console.error("Error returning material:", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaal niet retourneren",
        duration: 3000,
      });
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    form.reset({
      typeId: material.typeId,
      volunteerId: material.volunteerId || "",
      numbers: [material.number],
    });
    setDialogOpen(true);
  };

  const handleEditType = (type: MaterialType) => {
    setEditingMaterialType(type);
    typeForm.reset({
      name: type.name,
      maxCount: type.maxCount,
    });
    setIsTypesDialogOpen(true);
  };

  const normalizeString = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filteredMaterials = materials.filter((material) => {
    if (!material.isCheckedOut) return false;

    // Filter op geselecteerd materiaaltype
    if (selectedMaterialType) {
      const type = materialTypes.find((t) => t.id === material.typeId);
      if (type?.id !== selectedMaterialType) return false;
    }

    if (!searchTerm.trim()) return true;

    const type = materialTypes.find((t) => t.id === material.typeId);
    const volunteer = volunteers.find((v) => v.id === material.volunteerId);

    const searchNormalized = normalizeString(searchTerm);
    const typeNameNormalized = normalizeString(type?.name || "");
    const volunteerNameNormalized = volunteer
      ? normalizeString(`${volunteer.firstName} ${volunteer.lastName}`)
      : "";
    const numberString = material.number.toString();

    return (
      typeNameNormalized.includes(searchNormalized) ||
      volunteerNameNormalized.includes(searchNormalized) ||
      numberString.includes(searchNormalized)
    );
  });

  const selectedType = materialTypes.find((t) => t.id === form.watch("typeId"));
  const maxNumber = selectedType?.maxCount || 100;

  const checkedOutMaterials = materials.filter((m) => m.isCheckedOut).length;
  const checkedOutByType = materialTypes.map((type) => ({
    name: type.name,
    count: materials.filter((m) => m.typeId === type.id && m.isCheckedOut)
      .length,
    total: type.maxCount,
  }));

  const toggleSelectAll = () => {
    if (selectedMaterials.length === filteredMaterials.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(filteredMaterials.map((m) => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleBulkReturn = async (materialIds: string[]) => {
    try {
      const updates = {};
      const loggingPromises = [];
      const materialsList = [];

      for (const id of materialIds) {
        const material = materials.find((m) => m.id === id);
        if (!material) continue;

        updates[`materials/${id}/volunteerId`] = null;
        updates[`materials/${id}/isCheckedOut`] = false;

        const type = materialTypes.find((t) => t.id === material.typeId);
        const volunteer = volunteers.find((v) => v.id === material.volunteerId);
        materialsList.push({
          name: type?.name || "Onbekend materiaal",
          number: material.number,
          volunteer: volunteer
            ? `${volunteer.firstName} ${volunteer.lastName}`
            : "Onbekend",
        });

        loggingPromises.push(
          logUserAction(
            UserActionTypes.MATERIAL_BULK_RETURN,
            `${type?.name || "Materiaal"} #${material.number} geretourneerd van ${volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "onbekende vrijwilliger"}`,
            {
              type: "material",
              id: material.id,
              name: type?.name || "Onbekend materiaal",
              materialNumber: material.number.toString(),
              volunteerId: material.volunteerId,
              volunteerName: volunteer
                ? `${volunteer.firstName} ${volunteer.lastName}`
                : undefined,
            },
          ),
        );
      }

      await update(ref(db, ""), updates);
      await Promise.all(loggingPromises);

      toast({
        title: "Succes",
        description: "Materialen succesvol geretourneerd",
        duration: 3000,
        variant: "success",
      });
      setSelectedMaterials([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materialen niet retourneren",
        duration: 3000,
      });
    }
  };

  const filteredVolunteers = volunteers.filter((volunteer) => {
    const fullName =
      `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    const activityLogsRef = ref(db, "activityLogs");
    onValue(activityLogsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const returnedItems = Object.entries(data)
        .filter(([_, log]: [string, any]) => log.action === "return")
        .map(([id, log]: [string, any]) => {
          const materialType = materialTypes.find(t => t.id === log.materialTypeId);
          const volunteer = volunteers.find(v => v.id === log.volunteerId);
          return {
            id,
            materialType: materialType?.name || "Onbekend",
            number: log.materialNumber,
            borrower: volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "Onbekend",
            borrowDate: log.originalCheckoutDate || "Onbekend",
            returnDate: log.timestamp,
          };
        });

      setReturnedMaterials(returnedItems);
    });
  }, [materialTypes, volunteers]);

  const filteredReturnedMaterials = returnedMaterials.filter(item => {
    if (!searchReturned) return true;

    const searchLower = searchReturned.toLowerCase();
    return (
      item.borrower.toLowerCase().includes(searchLower) ||
      item.materialType.toLowerCase().includes(searchLower) ||
      item.number.toString().includes(searchLower)
    );
  });


  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Package2 className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-2xl sm:text-3xl font-bold text-[#963E56]">
          Materiaalbeheer
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {checkedOutByType.map((stat) => (
          <Card 
            key={stat.name} 
            className={cn(
              "p-2 sm:p-4 cursor-pointer transition-all hover:shadow-md",
              selectedMaterialType === materialTypes.find(t => t.name === stat.name)?.id 
                ? "bg-[#963E56]/5 border-[#963E56]" 
                : "hover:bg-[#963E56]/5"
            )}
            onClick={() => {
              const type = materialTypes.find(t => t.name === stat.name);
              if (type) {
                setSelectedMaterialType(
                  selectedMaterialType === type.id ? null : type.id
                );
              }
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
                {stat.name}
                {selectedMaterialType === materialTypes.find(t => t.name === stat.name)?.id && (
                  <Check className="h-4 w-4 text-[#963E56]" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getMaterialIcon(stat.name)}
                  <div className="ml-2 sm:ml-3">
                    <div className="text-lg sm:text-2xl font-bold">
                      {stat.count}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      van {stat.total}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <PlanningSection title="Uitgeleende Materialen">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op type, nummer of vrijwilliger..."
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
                className="pl-9 w-full"
                type="search"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {isAdmin && (
                <Dialog open={isTypesDialogOpen} onOpenChange={setIsTypesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Settings2 className="h-4 w-4 mr-2" />
                      <span className="whitespace-nowrap">Types Beheren</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-[450px] p-4 bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {editingMaterialType ? "Materiaaltype Bewerken" : "Nieuw Materiaaltype"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...typeForm}>
                      <form onSubmit={typeForm.handleSubmit(onSubmitType)} className="space-y-4">
                        <FormField
                          control={typeForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Naam</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Materiaaltype naam" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={typeForm.control}
                          name="maxCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum aantal</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={100}
                                  {...field}
                                  placeholder="Maximum aantal"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit">
                          {editingMaterialType ? "Bijwerken" : "Toevoegen"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog 
                open={dialogOpen} 
                onOpenChange={(open) => {
                  if (!open && formError) {
                    return;
                  }
                  if (!open) {
                    setFormError(null);
                    form.reset();
                    setSelectedMaterialTypes([]);
                  }
                  setDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto gap-2 bg-[#963E56] hover:bg-[#963E56]/90 text-white">
                    <Package2 className="h-4 w-4" />
                    Toewijzen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-[600px] p-4 bg-white mx-2">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-semibold text-[#963E56]">
                      Materiaal Toewijzen
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const success = await form.handleSubmit(onSubmit)(e);
                        if (!success) {
                          e.stopPropagation();
                        }
                      }}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="volunteerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vrijwilliger</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecteer vrijwilliger" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="sticky top-0 px-2 py-2 bg-white border-b">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <input
                                      type="text"
                                      placeholder="Zoek vrijwilliger..."
                                      value={volunteerSearchTerm}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setVolunteerSearchTerm(e.target.value);
                                      }}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="w-full pl-9 h-9 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                  </div>
                                </div>
                                <div className="pt-1 max-h-[300px] overflow-y-auto">
                                  {volunteers
                                    .filter((volunteer) => {
                                      const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
                                      return fullName.includes(volunteerSearchTerm.toLowerCase());
                                    })
                                    .map((volunteer) => (
                                      <SelectItem
                                        key={volunteer.id}
                                        value={volunteer.id}
                                        className="flex items-center justify-between py-2.5 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Check
                                            className={cn(
                                              "h-4 w-4 flex-shrink-0",
                                              field.value === volunteer.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          <span className="flex-grow">
                                            {volunteer.firstName} {volunteer.lastName}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                </div>
                              </SelectContent>
                            </Select>
                            {field.value && (
                              <div className="mt-2">
                                {(() => {
                                  const volunteer = volunteers.find(
                                    (v) => v.id === field.value,
                                  );
                                  if (volunteer) {
                                    return (
                                      <div className="bg-[#963E56]/10 text-[#963E56] text-sm rounded-full px-3 py-1 flex items-center gap-2 w-fit">
                                        <span>
                                          {volunteer.firstName} {volunteer.lastName}
                                        </span>
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
                                    );
                                  }
                                })()}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <FormLabel>Materialen</FormLabel>
                        <div className="space-y-4">
                          <Select
                            onValueChange={(value) => {
                              if (!selectedMaterialTypes.includes(value)) {
                                setSelectedMaterialTypes([
                                  ...selectedMaterialTypes,
                                  value,
                                ]);
                                const currentMaterials =
                                  form.getValues("materials") || [];
                                form.setValue("materials", [
                                  ...currentMaterials,
                                  { typeId: value, numbers: [] },
                                ]);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer materiaal type" />
                            </SelectTrigger>
                            <SelectContent>
                              {materialTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {form.watch("materials")?.map((material, index) => {
                            const materialType = materialTypes.find(
                              (t) => t.id === material.typeId,
                            );
                            // Get available numbers (not checked out)
                            const availableNumbers = Array.from(
                              { length: materialType?.maxCount ||0 }, 
                              (_, i) => i + 1
                            ).filter(number => 
                              !materials.some(m => 
                                m.typeId === material.typeId && 
                                m.number === number && 
                                m.isCheckedOut
                              )
                            );

                            return (
                              <div
                                key={material.typeId}
                                className="space-y-2 p-4 border rounded-lg"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">
                                    {materialType?.name}
                                  </h4>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const updatedMaterials = form.getValues("materials").filter((_, i) => i !== index);
                                      form.setValue("materials", updatedMaterials);
                                      setSelectedMaterialTypes(
                                        selectedMaterialTypes.filter(
                                          (id) => id !== material.typeId,
                                        ),
                                      );
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="relative">
                                  <Select
                                    onValueChange={(value) => {
                                      if (!value) return;

                                      const number = parseInt(value);
                                      const currentNumbers = material.numbers || [];

                                      if (!currentNumbers.includes(number)) {
                                        const updatedMaterials = form.getValues("materials");
                                        updatedMaterials[index].numbers = [...currentNumbers, number];
                                        form.setValue("materials", updatedMaterials);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Selecteer materiaal nummer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableNumbers.map((number) => (
                                        <SelectItem 
                                          key={number} 
                                          value={number.toString()}
                                        >
                                          #{number}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {material.numbers && material.numbers.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {material.numbers.map((number) => (
                                      <Badge
                                        key={number}
                                        variant="outline"
                                        className="flex items-center gap-1"
                                      >
                                        #{number}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-3 w-3 p-0 hover:bg-transparent"
                                          onClick={() => {
                                            const updatedMaterials = form.getValues("materials");
                                            updatedMaterials[index].numbers = material.numbers.filter(
                                              (n) => n !== number
                                            );
                                            form.setValue("materials", updatedMaterials);
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {formError && (
                        <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-4 mb-4">
                          <p className="font-medium">Let op!</p>
                          <p>{formError}</p>
                        </div>
                      )}

                      <div className="flex gap-2 justify-end mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFormError(null);
                            form.reset();
                            setSelectedMaterialTypes([]);
                            setDialogOpen(false);
                          }}
                        >
                          Annuleren
                        </Button>
                        <Button type="submit">
                          Materiaal Toewijzen
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-[600px] sm:min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Nummer</TableHead>
                      <TableHead className="whitespace-nowrap">Vrijwilliger</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((item) => {
                      const type = materialTypes.find((t) => t.id === item.typeId);
                      const volunteer = volunteers.find((v) => v.id === item.volunteerId);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="capitalize">
                            {type?.name || "Onbekend type"}
                          </TableCell>
                          <TableCell>{item.number}</TableCell>
                          <TableCell>
                            {volunteer
                              ? `${volunteer.firstName} ${volunteer.lastName}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-[#963E56]/10 text-[#963E56] border-[#963E56]/20"
                            >
                              Uitgeleend
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReturn(item.id)}
                                    className="h-8 w-8 text-[#963E56] hover:text-[#963E56]/90 hover:bg-[#963E56]/10"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Retourneren</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredMaterials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Geen uitgeleende materialen gevonden.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </PlanningSection>

        <PlanningSection title="Geretourneerde Materialen">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Zoek op naam, materiaal of nummer..."
              value={searchReturned}
              onChange={(e) => setSearchReturned(e.target.value)}
              className="pl-9 w-full"
              type="search"
              autoComplete="off"
            />
          </div>

          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Materiaal</TableHead>
                    <TableHead>Nummer</TableHead>
                    <TableHead>Uitgeleend aan</TableHead>
                    <TableHead>Uitgeleend op</TableHead>
                    <TableHead>Geretourneerd op</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturnedMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        Geen geretourneerde materialen gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReturnedMaterials.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.materialType}</TableCell>
                        <TableCell>{item.number}</TableCell>
                        <TableCell>{item.borrower}</TableCell>
                        <TableCell>
                          {item.borrowDate && item.borrowDate !== "Onbekend"
                            ? format(parseISO(item.borrowDate), "d MMM yyyy", { locale: nl })
                            : "Onbekend"}
                        </TableCell>
                        <TableCell>
                          {item.returnDate && item.returnDate !== "Onbekend"
                            ? format(parseISO(item.returnDate), "d MMM yyyy", { locale: nl })
                            : "Onbekend"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </PlanningSection>
      </div>
    </div>
  );
};

export default Materials;