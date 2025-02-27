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
import { GiMonclerJacket, GiWalkieTalkie } from 'react-icons/gi';
import { TbJacket } from 'react-icons/tb';

const materialSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht"),
  materials: z.array(z.object({
    typeId: z.string().min(1, "Type materiaal is verplicht"),
    numbers: z.array(z.number().min(1).max(100))
  })).min(1, "Selecteer ten minste één materiaal"),
});

const materialTypeSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  maxCount: z.coerce.number().min(1, "Minimaal 1 vereist").max(100, "Maximaal 100 toegestaan"),
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
  if (name.includes('jas')) return <GiMonclerJacket className="h-8 w-8 text-primary/80" />;
  if (name.includes('hesje')) return <TbJacket className="h-8 w-8 text-primary/80" />;
  if (name.includes('lamp')) return <Flashlight className="h-8 w-8 text-primary/80" />;
  if (name.includes('walkie')) return <GiWalkieTalkie className="h-8 w-8 text-primary/80" />;
  return <Package2 className="h-8 w-8 text-primary/80" />;
};

const MaterialsPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [isTypesDialogOpen, setIsTypesDialogOpen] = useState(false);
  const [editingMaterialType, setEditingMaterialType] = useState<MaterialType | null>(null);
  const [deleteMaterialTypeId, setDeleteMaterialTypeId] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useRole();

  const form = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      volunteerId: "",
      materials: []
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
      const typesList = data ? Object.entries(data).map(([id, type]) => ({
        id,
        ...(type as Omit<MaterialType, "id">),
      })) : [];
      setMaterialTypes(typesList);
    });

    const materialsRef = ref(db, "materials");
    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      const materialsList = data ? Object.entries(data).map(([id, material]) => ({
        id,
        ...(material as Omit<Material, "id">),
      })) : [];
      setMaterials(materialsList);
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

  const logActivity = async (
    action: 'checkout' | 'return',
    material: Material,
    volunteerId: string
  ) => {
    try {
      await push(ref(db, "activityLogs"), {
        action,
        materialTypeId: material.typeId,
        materialNumber: material.number,
        volunteerId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  const onSubmit = async (data: z.infer<typeof materialSchema>) => {
    try {
      const volunteer = volunteers.find(v => v.id === data.volunteerId);

      const createPromises = data.materials.flatMap(material => {
        const materialType = materialTypes.find(t => t.id === material.typeId);

        return material.numbers.map(async (number) => {
          await push(ref(db, "materials"), {
            typeId: material.typeId,
            volunteerId: data.volunteerId,
            number,
            isCheckedOut: true,
          });

          await logUserAction(
            UserActionTypes.MATERIAL_CHECKOUT,
            `${materialType?.name || 'Materiaal'} #${number} uitgeleend aan ${volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'onbekende vrijwilliger'}`,
            {
              type: "material",
              name: materialType?.name || 'Onbekend materiaal',
              materialNumber: number.toString(),
              volunteerName: volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : undefined
            }
          );
        });
      });

      await Promise.all(createPromises);

      const totalItems = data.materials.reduce((sum, material) => sum + material.numbers.length, 0);

      toast({
        title: "Succes",
        description: `${totalItems} materialen succesvol toegewezen aan ${volunteer?.firstName} ${volunteer?.lastName}`,
        duration: 3000,
      });

      form.reset();
      setSelectedMaterialTypes([]);
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaal niet toewijzen",
        duration: 3000,
      });
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
            name: data.name
          }
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
            name: data.name
          }
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
      const materialType = materialTypes.find(t => t.id === id);
      if (!materialType) return;

      await remove(ref(db, `materialTypes/${id}`));
      await logUserAction(
        UserActionTypes.MATERIAL_TYPE_DELETE,
        `Materiaaltype ${materialType.name} verwijderd`,
        {
          type: "material",
          id: id,
          name: materialType.name
        }
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
      const material = materials.find(m => m.id === materialId);
      if (!material) return;

      const materialType = materialTypes.find(t => t.id === material.typeId);
      const volunteer = volunteers.find(v => v.id === material.volunteerId);

      await update(ref(db, `materials/${materialId}`), {
        volunteerId: null,
        isCheckedOut: false,
      });

      await logUserAction(
        UserActionTypes.MATERIAL_RETURN,
        `${materialType?.name || 'Materiaal'} #${material.number} geretourneerd van ${volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'onbekende vrijwilliger'}`,
        {
          type: "material",
          id: material.id,
          name: materialType?.name || 'Onbekend materiaal',
          materialNumber: material.number.toString(),
          volunteerName: volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : undefined
        }
      );

      toast({
        title: "Materiaal Geretourneerd",
        description: "Het materiaal is succesvol geretourneerd",
        duration: 3000,
        variant: "success",
      });
    } catch (error) {
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

  const filteredMaterials = materials.filter(material => {
    if (!material.isCheckedOut) return false;

    const type = materialTypes.find(t => t.id === material.typeId);
    const volunteer = volunteers.find(v => v.id === material.volunteerId);
    const searchString = `${type?.name || ''} ${volunteer?.firstName || ''} ${volunteer?.lastName || ''} ${material.number}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const selectedType = materialTypes.find(t => t.id === form.watch("typeId"));
  const maxNumber = selectedType?.maxCount || 100;

  const checkedOutMaterials = materials.filter(m => m.isCheckedOut).length;
  const checkedOutByType = materialTypes.map(type => ({
    name: type.name,
    count: materials.filter(m => m.typeId === type.id && m.isCheckedOut).length,
    total: type.maxCount
  }));

  const toggleSelectAll = () => {
    if (selectedMaterials.length === filteredMaterials.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(filteredMaterials.map(m => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedMaterials(prev =>
      prev.includes(id)
        ? prev.filter(m => m !== id)
        : [...prev, id]
    );
  };

  const handleBulkReturn = async (materialIds: string[]) => {
    try {
      const updates = {};
      const loggingPromises = [];
      const materialsList = [];

      for (const id of materialIds) {
        const material = materials.find(m => m.id === id);
        if (!material) continue;

        updates[`materials/${id}/volunteerId`] = null;
        updates[`materials/${id}/isCheckedOut`] = false;

        const type = materialTypes.find(t => t.id === material.typeId);
        const volunteer = volunteers.find(v => v.id === material.volunteerId);
        materialsList.push({
          name: type?.name || 'Onbekend materiaal',
          number: material.number,
          volunteer: volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Onbekend'
        });

        loggingPromises.push(
          logUserAction(
            UserActionTypes.MATERIAL_BULK_RETURN,
            `${type?.name || 'Materiaal'} #${material.number} geretourneerd van ${volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'onbekende vrijwilliger'}`,
            {
              type: "material",
              id: material.id,
              name: type?.name || 'Onbekend materiaal',
              materialNumber: material.number.toString(),
              volunteerId: material.volunteerId,
              volunteerName: volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : undefined
            }
          )
        );
      }

      await update(ref(db, ''), updates);
      await Promise.all(loggingPromises);

      toast({
        title: 'Succes',
        description: 'Materialen succesvol geretourneerd',
        duration: 3000,
        variant: "success"
      });
      setSelectedMaterials([]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: 'Kon materialen niet retourneren',
        duration: 3000
      });
    }
  };


  const filteredVolunteers = volunteers.filter(volunteer => {
    const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Package2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Materiaalbeheer</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {checkedOutByType.map(stat => (
          <Card key={stat.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getMaterialIcon(stat.name)}
                  <div className="ml-3">
                    <div className="text-2xl font-bold">{stat.count}</div>
                    <div className="text-sm text-muted-foreground">van {stat.total}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="relative flex-none w-64 sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoeken..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          {isAdmin && (
            <Dialog open={isTypesDialogOpen} onOpenChange={setIsTypesDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Types Beheren
                </Button>
              </DialogTrigger>
              <DialogContent>
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#963E56] hover:bg-[#963E56]/90 text-white">
                <Package2 className="h-4 w-4" />
                <span className="hidden sm:inline">Toewijzen</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[600px] p-4 sm:p-6 bg-white border-none shadow-lg mx-4">
              <DialogHeader className="mb-4 space-y-2">
                <DialogTitle className="text-xl font-semibold text-[#963E56]">
                  Materiaal Toewijzen
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full pl-9 h-9 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </div>
                            </div>
                            <div className="pt-1 max-h-[300px] overflow-y-auto">
                              {volunteers
                                .filter(volunteer => {
                                  const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
                                  return fullName.includes(searchTerm.toLowerCase());
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
                                          field.value === volunteer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="flex-grow">{volunteer.firstName} {volunteer.lastName}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </div>
                          </SelectContent>
                        </Select>
                        {field.value && (
                          <div className="mt-2">
                            {(() => {
                              const volunteer = volunteers.find(v => v.id === field.value);
                              if (volunteer) {
                                return (
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
                            setSelectedMaterialTypes([...selectedMaterialTypes, value]);
                            const currentMaterials = form.getValues("materials") || [];
                            form.setValue("materials", [...currentMaterials, { typeId: value, numbers: [] }]);
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
                        const materialType = materialTypes.find(t => t.id === material.typeId);
                        return (
                          <div key={material.typeId} className="space-y-2 p-4 border rounded-lg">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">{materialType?.name}</h4>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updatedMaterials = form.getValues("materials").filter((_, i) => i !== index);
                                  form.setValue("materials", updatedMaterials);
                                  setSelectedMaterialTypes(selectedMaterialTypes.filter(id => id !== material.typeId));
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <Select
                              onValueChange={(value) => {
                                const number = parseInt(value);
                                const currentNumbers = material.numbers || [];
                                if (!currentNumbers.includes(number)) {
                                  const updatedMaterials = form.getValues("materials");
                                  updatedMaterials[index].numbers = [...currentNumbers, number];
                                  form.setValue("materials", updatedMaterials);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecteer nummer" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: materialType?.maxCount || 0 }).map((_, i) => {
                                  const number = i + 1;
                                  const isCheckedOut = materials.some(
                                    m => m.typeId === material.typeId &&
                                      m.number === number &&
                                      m.isCheckedOut
                                  );
                                  if (!isCheckedOut) {
                                    return (
                                      <SelectItem key={number} value={number.toString()}>
                                        {number}
                                      </SelectItem>
                                    );
                                  }
                                  return null;
                                })}
                              </SelectContent>
                            </Select>

                            {material.numbers && material.numbers.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {material.numbers.map((number) => (
                                  <div
                                    key={number}
                                    className="bg-primary/10 text-primary text-sm rounded-full px-3 py-1 flex items-center gap-2"
                                  >
                                    <span>#{number}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 p-0 hover:bg-transparent"
                                      onClick={() => {
                                        const updatedMaterials = form.getValues("materials");
                                        updatedMaterials[index].numbers = material.numbers.filter(n => n !== number);
                                        form.setValue("materials", updatedMaterials);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Materiaal Toewijzen
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {isAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`${isEditMode ? "bg-primary/10 text-primary" : ""}`}
                  >
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isEditMode ? "Bewerken afsluiten" : "Lijst bewerken"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isEditMode && (
                  <TableHead className="w-[50px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSelectAll}
                            className="hover:bg-transparent"
                          >
                            {selectedMaterials.length === filteredMaterials.length ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {selectedMaterials.length === filteredMaterials.length ?
                            "Deselecteer alles" : "Selecteer alles"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                )}
                <TableHead>Type</TableHead>
                <TableHead className="hidden sm:table-cell">Nummer</TableHead>
                <TableHead>Vrijwilliger</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((item) => {
                const type = materialTypes.find((t) => t.id === item.typeId);
                const volunteer = volunteers.find((v) => v.id === item.volunteerId);
                return (
                  <TableRow key={item.id}>
                    {isEditMode && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSelect(item.id)}
                          className="hover:bg-transparent"
                        >
                          {selectedMaterials.includes(item.id) ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                    <TableCell>{type?.name || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">#{item.number}</TableCell>
                    <TableCell>{volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={item.isCheckedOut ? "default" : "secondary"}>
                        {item.isCheckedOut ? "Uitgeleend" : "Beschikbaar"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.isCheckedOut && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleReturn(item.id)}
                                  className="text-[#963E56] hover:text-[#963E56]/90 hover:bg-[#963E56]/10"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retourneren</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isAdmin && isEditMode && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
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
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredMaterials.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isEditMode ? 6 : 5}
                    className="h-24 text-center"
                  >
                    Geen materialen gevonden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isEditMode && selectedMaterials.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 flex items-center justify-between bg-card p-4 rounded-lg shadow-lg border animate-in slide-in-from-bottom-2">
          <span className="text-sm text-muted-foreground">
            {selectedMaterials.length} geselecteerd
          </span>
          <Button
            variant="default"
            onClick={() => handleBulkReturn(selectedMaterials)}
            className="bg-primary hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4 mr-2" />            Retourneren
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!deleteMaterialTypeId}
        onOpenChange={() => setDeleteMaterialTypeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteMaterialTypeId(null)}>
              Annuleren
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteMaterialTypeId) {
                handleDeleteMaterialType(deleteMaterialTypeId);
              }
            }}>
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaterialsPage;