import React, { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StatBlock = {
  id: string;
  title: string;
  count: number;
  subtitle: string;
  icon: React.ReactNode;
};

type DetailBlock = {
  id: string;
  title: string;
  data: any[];
  columns: {
    header: string;
    accessor: string;
  }[];
};

interface DashboardProps {
  statBlocks: StatBlock[];
  detailBlocks: DetailBlock[];
}

export default function TemplateDashboard({ statBlocks, detailBlocks }: DashboardProps) {
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const selectedDetail = detailBlocks.find(block => block.id === selectedBlock);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Dashboard</h1>
      </div>

      {/* Statistiek Blokken */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {statBlocks.map((block) => (
          <Card 
            key={block.id}
            className="cursor-pointer transition-all hover:shadow-md hover:bg-primary/5"
            onClick={() => setSelectedBlock(block.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {block.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {block.icon}
                  <div className="ml-2 sm:ml-3">
                    <div className="text-lg sm:text-2xl font-bold">{block.count}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{block.subtitle}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details Dialog */}
      <Dialog open={selectedBlock !== null} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-primary">
              {selectedDetail?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {selectedDetail?.columns.map((column) => (
                    <TableHead key={column.accessor} className="font-semibold">
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDetail?.data.map((item, index) => (
                  <TableRow key={index}>
                    {selectedDetail.columns.map((column) => (
                      <TableCell key={column.accessor}>
                        {item[column.accessor]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {selectedDetail?.data.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={selectedDetail.columns.length} 
                      className="text-center text-muted-foreground py-8"
                    >
                      Geen gegevens beschikbaar
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
