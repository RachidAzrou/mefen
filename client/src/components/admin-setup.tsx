import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { createAdminUser } from '@/lib/roles';
import { toast } from "@/hooks/use-toast";

export function AdminSetup() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSetAdmin = async () => {
    setIsLoading(true);
    try {
      const success = await createAdminUser(
        'AzlIm0Ff5mcyydzc59x49qBrvjS2',  // User's UID
        'razrou@outlook.be'               // User's email
      );
      if (success) {
        toast({
          title: "Succes",
          description: "Gebruiker is succesvol ingesteld als admin",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Fout",
          description: "Kon gebruiker niet instellen als admin",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSetAdmin} 
      disabled={isLoading}
      className="bg-[#963E56] hover:bg-[#963E56]/90"
    >
      {isLoading ? "Bezig..." : "Maak razrou@outlook.be Admin"}
    </Button>
  );
}