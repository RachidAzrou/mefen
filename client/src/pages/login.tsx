import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { LockKeyhole, Mail } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";

const loginSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens bevatten"),
});

const resetSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export default function Login() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      await logUserAction(
        UserActionTypes.LOGIN,
        undefined,
        {
          type: "auth",
          id: data.email,
          name: data.email
        }
      );
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Ongeldig e-mailadres of wachtwoord",
        duration: 3000,
      });
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    try {
      await sendPasswordResetEmail(auth, data.email);
      await logUserAction(
        UserActionTypes.PASSWORD_RESET,
        `Wachtwoord reset aangevraagd voor ${data.email}`,
        {
          type: "auth",
          id: data.email,
          name: data.email
        }
      );
      toast({
        title: "Wachtwoord reset link verzonden",
        description: "Controleer je e-mail voor instructies om je wachtwoord te resetten.",
        duration: 3000,
      });
      setResetDialogOpen(false);
      resetForm.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon geen wachtwoord reset link verzenden. Controleer je e-mailadres.",
        duration: 3000,
      });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-no-repeat bg-cover bg-center relative px-4 py-8 md:p-4"
      style={{
        backgroundImage: `url('/static/123.jpg')`
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-[500px]">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
          <CardContent className="pt-8 px-4 sm:px-8">
            <div className="text-center mb-8">
              <div className="w-full flex justify-center items-center">
                <img
                  src="/static/Naamloos.png"
                  alt="MEFEN"
                  className="h-20 sm:h-24 mx-auto mb-6"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#963E56] mb-3">
                Vrijwilligersbeheer
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Log in om de vrijwilligers te beheren
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#963E56]" />
                  <Input
                    type="email"
                    placeholder="E-mailadres"
                    className="h-12 pl-10 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 pl-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#963E56]" />
                  <Input
                    type="password"
                    placeholder="Wachtwoord"
                    className="h-12 pl-10 border-gray-200 focus:border-[#963E56] focus:ring-[#963E56] transition-all duration-200"
                    {...form.register("password")}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500 pl-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setResetDialogOpen(true)}
                  className="text-[#963E56] hover:underline font-medium text-sm"
                >
                  Wachtwoord vergeten?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-[#963E56] hover:bg-[#963E56]/90 transition-colors duration-300"
              >
                Inloggen
              </Button>

              <div className="text-center mt-4">
                <Link href="/register" className="text-[#963E56] hover:underline font-medium">
                  Registreer als vrijwilliger
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-1 mt-6">
          <p className="text-white/90 text-sm font-medium">
            MEFEN Vrijwilligers Management Systeem
          </p>
          <p className="text-white/70 text-xs">
            Versie 2.1.6
          </p>
        </div>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#963E56]">Wachtwoord Resetten</DialogTitle>
          </DialogHeader>
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mailadres</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Voer je e-mailadres in"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-[#963E56] hover:bg-[#963E56]/90">
                Reset link versturen
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}