import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TemplateLayout } from "./template_layout";
import { Home, Calendar, Users, Box, Radio, Grid } from "lucide-react";

// Initialiseer de query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minuten
      retry: 1,
    },
  },
});

// Navigatie configuratie
const navigation = [
  {
    title: "Dashboard",
    href: "/",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Planning",
    href: "/planning",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    title: "Vrijwilligers",
    href: "/volunteers",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Materialen",
    href: "/materials",
    icon: <Box className="h-4 w-4" />,
  },
  {
    title: "Communicatie",
    href: "/communication",
    icon: <Radio className="h-4 w-4" />,
  },
  {
    title: "Sufuf",
    href: "/sufuf",
    icon: <Grid className="h-4 w-4" />,
  }
];

export function TemplateApp({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TemplateLayout navigation={navigation}>
        {children}
      </TemplateLayout>
      <Toaster />
    </QueryClientProvider>
  );
}