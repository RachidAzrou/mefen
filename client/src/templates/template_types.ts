import { z } from "zod";

// Basis interface voor items in een lijst/tabel
export interface BaseItem {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

// Voorbeeld van een basis schema voor formulieren
export const baseFormSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  description: z.string().optional(),
});

// Statistiek kaart interface
export interface StatCard {
  title: string;
  count: number;
  subtitle: string;
  icon: React.ReactNode;
}

// Tabel kolom definitie
export interface TableColumn {
  header: string;
  accessor: string;
}

// Tabel configuratie interface
export interface TableConfig {
  columns: TableColumn[];
  data: any[];
}

// Basis formulier configuratie
export interface FormConfig {
  schema: z.ZodObject<any>;
  onSubmit: (data: any) => Promise<void>;
}

// Pagina configuratie interface
export interface PageConfig {
  title: string;
  icon: React.ReactNode;
  statCards: StatCard[];
  tableConfig: TableConfig;
  formConfig: FormConfig;
}
