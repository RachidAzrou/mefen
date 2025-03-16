import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import PlanningForm, { PlanningFormData } from "./planning-form";
import { UseFormReturn } from "react-hook-form";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlanning: any | null;
  form: UseFormReturn<PlanningFormData>;
  onSubmit: (data: PlanningFormData) => Promise<void>;
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
}

export function PlanningDialog({
  open,
  onOpenChange,
  editingPlanning,
  form,
  onSubmit,
  volunteers,
  rooms,
}: PlanningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-[#800020] hover:bg-[#800020]/90 text-white min-w-[200px] font-medium shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 rounded-lg py-2.5"
        >
          <Plus className="h-5 w-5" />
          <span>Inplannen</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <PlanningForm
          form={form}
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
          volunteers={volunteers}
          rooms={rooms}
          editingPlanning={editingPlanning}
        />
      </DialogContent>
    </Dialog>
  );
}