import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Deze interface definieert de props die de template verwacht
interface TemplateContentProps {
  title: string;              // Pagina titel
  icon: React.ReactNode;      // Icon component voor de header
  statCards: {               // Statistische kaarten bovenaan de pagina
    title: string;
    count: number;
    subtitle: string;
    icon: React.ReactNode;
  }[];
  formSchema: z.ZodObject<any>; // Zod schema voor het formulier
  tableColumns: {            // Kolom definities voor de tabel
    header: string;
    accessor: string;
  }[];
  tableData: any[];          // Data voor de tabel
  onSubmit: (data: any) => Promise<void>; // Submit handler voor het formulier
}

export default function TemplateContent({
  title,
  icon,
  statCards,
  formSchema,
  tableColumns,
  tableData,
  onSubmit
}: TemplateContentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
  });

  const handleSubmit = async (data: any) => {
    try {
      setFormError(null);
      await onSubmit(data);
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      setFormError("Er is een fout opgetreden bij het verwerken van de gegevens");
    }
  };

  const filteredData = tableData.filter(item => 
    Object.values(item)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {icon}
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          {title}
        </h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {stat.icon}
                  <div className="ml-2 sm:ml-3">
                    <div className="text-lg sm:text-2xl font-bold">
                      {stat.count}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {stat.subtitle}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken..."
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
              className="pl-9 w-full"
              type="search"
            />
          </div>

          {/* Add Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto gap-2">
                <Plus className="h-4 w-4" />
                Toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuw Item Toevoegen</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  {Object.keys(formSchema.shape).map((fieldName) => (
                    <FormField
                      key={fieldName}
                      control={form.control}
                      name={fieldName}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{fieldName}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}

                  {formError && (
                    <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                      {formError}
                    </div>
                  )}

                  <Button type="submit" className="w-full">
                    Toevoegen
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {tableColumns.map((column) => (
                <TableHead key={column.accessor}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item, index) => (
              <TableRow key={index}>
                {tableColumns.map((column) => (
                  <TableCell key={column.accessor}>
                    {item[column.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  Geen resultaten gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
