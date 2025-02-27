import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateUserRole } from "@/lib/roles";
import { db, auth } from "@/lib/firebase";
import { ref, onValue, remove } from "firebase/database";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, UserPlus, Users, Activity, CalendarIcon, Shield, Key, Trash2, RotateCcw } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { logUserAction, UserActionTypes, UserAction, getUserLogs } from "@/lib/activity-logger";

type DatabaseUser = {
  uid: string;
  email: string;
  admin: boolean;
};

const newUserSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens bevatten"),
  isAdmin: z.boolean().default(false),
});

type NewUserFormData = z.infer<typeof newUserSchema>;

export default function Settings() {
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [userLogs, setUserLogs] = useState<(UserAction & { id: string })[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [deletingUser, setDeletingUser] = useState<DatabaseUser | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useRole();

  const form = useForm<NewUserFormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      isAdmin: false,
    },
  });

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data).map(([uid, userData]: [string, any]) => ({
          uid,
          ...userData
        }));
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const logs = await getUserLogs({
          startDate: selectedDate,
          userId: selectedUser === "all" ? undefined : selectedUser
        });
        setUserLogs(logs as (UserAction & { id: string })[]);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    fetchLogs();
  }, [selectedDate, selectedUser]);

  const handleRoleChange = async (uid: string, email: string, newIsAdmin: boolean) => {
    try {
      await updateUserRole(uid, email, newIsAdmin);
      await logUserAction(
        UserActionTypes.USER_ROLE_UPDATE,
        `${email} is nu ${newIsAdmin ? 'administrator' : 'medewerker'}`,
        {
          type: "user",
          id: uid,
          name: email
        }
      );
      toast({
        title: "Succes",
        description: `Gebruiker ${email} is nu ${newIsAdmin ? 'admin' : 'medewerker'}`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon gebruikersrol niet wijzigen",
        duration: 3000,
      });
    }
  };

  const onSubmit = async (data: NewUserFormData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateUserRole(userCredential.user.uid, data.email, data.isAdmin);
      await logUserAction(
        UserActionTypes.USER_CREATE,
        `Nieuwe gebruiker ${data.email} aangemaakt als ${data.isAdmin ? 'administrator' : 'medewerker'}`,
        {
          type: "user",
          id: userCredential.user.uid,
          name: data.email
        }
      );

      toast({
        title: "Succes",
        description: "Nieuwe gebruiker is succesvol aangemaakt",
        duration: 3000,
      });
      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message || "Kon gebruiker niet aanmaken",
        duration: 3000,
      });
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      await logUserAction(
        UserActionTypes.USER_PASSWORD_RESET,
        `Wachtwoord reset link verstuurd naar ${email}`,
        {
          type: "user",
          name: email
        }
      );

      toast({
        title: "Succes",
        description: "Een wachtwoord reset link is verstuurd naar de gebruiker",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message || "Kon wachtwoord reset link niet versturen",
        duration: 3000,
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      await remove(ref(db, `users/${deletingUser.uid}`));
      await logUserAction(
        UserActionTypes.USER_DELETE,
        `Gebruiker ${deletingUser.email} is verwijderd`,
        {
          type: "user",
          id: deletingUser.uid,
          name: deletingUser.email
        }
      );

      toast({
        title: "Succes",
        description: `Gebruiker ${deletingUser.email} is verwijderd`,
        duration: 3000,
      });
      setDeletingUser(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message || "Kon gebruiker niet verwijderen",
        duration: 3000,
      });
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('materiaal')) return '📦';
    if (action.includes('vrijwilliger')) return '👤';
    if (action.includes('planning')) return '📅';
    if (action.includes('gebruiker')) return '👥';
    if (action.includes('ingelogd') || action.includes('uitgelogd') || action.includes('wachtwoord')) return '🔑';
    if (action.includes('export')) return '📤';
    if (action.includes('import')) return '📥';
    if (action.includes('pdf') || action.includes('PDF')) return '📄';
    if (action.includes('ruimte')) return '🏢';
    if (action.includes('filter')) return '🔍';
    if (action.includes('zoek')) return '🔎';
    if (action.includes('bulk')) return '📚';
    if (action.includes('pagina') || action.includes('zijbalk')) return '📱';
    if (action.includes('modal')) return '💭';
    if (action.includes('bewerkingsmodus')) return '✏️';
    if (action.includes('sortering')) return '↕️';
    if (action.includes('vernieuwd')) return '🔄';
    return '📝';
  };

  const getActionDescription = (log: UserAction) => {
    const type = log.targetType?.toLowerCase();
    const name = log.targetName || '-';

    switch (type) {
      case 'material':
        return `${name}`;
      case 'volunteer':
      case 'planning':
      case 'user':
      case 'auth':
        return name;
      case 'export':
      case 'import':
        return `${name} (${format(new Date(log.timestamp), 'dd/MM/yyyy')})`;
      default:
        return log.details || name;
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Je hebt geen toegang tot deze pagina.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="h-8 w-8 sm:h-10 sm:w-10 text-[#963E56]" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#963E56]">Instellingen</h1>
      </div>

      <Accordion type="single" collapsible className="space-y-6">
        <AccordionItem value="add-user" className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <AccordionTrigger className="px-6 py-4 hover:bg-gray-50/80 data-[state=open]:bg-gray-50/80 transition-colors">
            <div className="flex items-center gap-3 text-[#963E56]">
              <UserPlus className="h-5 w-5" />
              <span className="font-semibold">Medewerker Toevoegen</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mailadres</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="naam@voorbeeld.be"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wachtwoord</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Minimaal 6 tekens"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isAdmin"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-[#963E56] focus:ring-[#963E56]"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Administrator rechten</FormLabel>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="bg-[#963E56] hover:bg-[#963E56]/90"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Medewerker Toevoegen
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="manage-users" className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <AccordionTrigger className="px-6 py-4 hover:bg-gray-50/80 data-[state=open]:bg-gray-50/80 transition-colors">
            <div className="flex items-center gap-3 text-[#963E56]">
              <Users className="h-5 w-5" />
              <span className="font-semibold">Gebruikersbeheer</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-6">
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  {/* Desktop view */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead>E-mailadres</TableHead>
                          <TableHead>Huidige Rol</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.uid} className="hover:bg-gray-50/30">
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.admin
                                  ? 'bg-[#963E56]/10 text-[#963E56]'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.admin ? 'Admin' : 'Medewerker'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => handleRoleChange(user.uid, user.email, !user.admin)}
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-[#963E56] text-white hover:bg-[#963E56]/90"
                                  title={`Maak ${user.admin ? 'Medewerker' : 'Admin'}`}
                                >
                                  <Shield className="h-4 w-4" />
                                  <span className="sr-only">{`Maak ${user.admin ? 'Medewerker' : 'Admin'}`}</span>
                                </Button>
                                <Button
                                  onClick={() => handlePasswordReset(user.email)}
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-[#963E56] text-white hover:bg-[#963E56]/90"
                                  title="Reset Wachtwoord"
                                >
                                  <Key className="h-4 w-4" />
                                  <span className="sr-only">Reset Wachtwoord</span>
                                </Button>
                                <Button
                                  onClick={() => setDeletingUser(user)}
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Verwijderen"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Verwijderen</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile view */}
                  <div className="block sm:hidden divide-y">
                    {users.map((user) => (
                      <div key={user.uid} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{user.email}</div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              user.admin
                                ? 'bg-[#963E56]/10 text-[#963E56]'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.admin ? 'Admin' : 'Medewerker'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRoleChange(user.uid, user.email, !user.admin)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-[#963E56] text-white hover:bg-[#963E56]/90"
                              title={`Maak ${user.admin ? 'Medewerker' : 'Admin'}`}
                            >
                              <Shield className="h-4 w-4" />
                              <span className="sr-only">{`Maak ${user.admin ? 'Medewerker' : 'Admin'}`}</span>
                            </Button>
                            <Button
                              onClick={() => handlePasswordReset(user.email)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-[#963E56] text-white hover:bg-[#963E56]/90"
                              title="Reset Wachtwoord"
                            >
                              <Key className="h-4 w-4" />
                              <span className="sr-only">Reset Wachtwoord</span>
                            </Button>
                            <Button
                              onClick={() => setDeletingUser(user)}
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              title="Verwijderen"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Verwijderen</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Geen gebruikers gevonden</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="activity-logs" className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <AccordionTrigger className="px-6 py-4 hover:bg-gray-50/80 data-[state=open]:bg-gray-50/80 transition-colors">
            <div className="flex items-center gap-3 text-[#963E56]">
              <Activity className="h-5 w-5" />
              <span className="font-semibold">Gebruikersactiviteit</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-6 space-y-6">
              <Card className="border-none shadow-none bg-gray-50/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-[#963E56]">Filters</CardTitle>
                  <CardDescription>
                    Filter de activiteiten op gebruiker en datum
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    <div className="w-full sm:w-auto space-y-1.5">
                      <label className="text-sm font-medium block">
                        Selecteer Gebruiker
                      </label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="w-full sm:w-[250px] bg-white">
                          <SelectValue placeholder="Alle gebruikers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle gebruikers</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.email} value={user.email}>
                              {user.email} {user.admin ? '(Admin)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full sm:w-auto space-y-1.5">
                      <label className="text-sm font-medium block">
                        Selecteer Datum
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full sm:w-[240px] justify-start text-left font-normal bg-white"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, "d MMMM yyyy", { locale: nl })
                            ) : (
                              <span>Kies een datum</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            initialFocus
                            locale={nl}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="w-full sm:w-auto space-y-1.5">
                      <label className="text-sm font-medium block">
                        Vernieuwen
                      </label>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsLoadingLogs(true);
                          setSelectedDate(new Date());
                          setSelectedUser("all");
                        }}
                        size="icon"
                        className="h-8 w-8"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedDate(new Date());
                        setSelectedUser("all");
                      }}
                      className="self-stretch sm:self-auto bg-white"
                    >
                      Reset Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-lg border overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="w-[160px] sm:w-[180px]">Tijdstip</TableHead>
                        <TableHead>Gebruiker</TableHead>
                        <TableHead>Activiteit</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLogs ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <Activity className="h-8 w-8 animate-spin" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : userLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Geen activiteiten gevonden voor de geselecteerde filters</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        userLogs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-gray-50/30">
                            <TableCell className="whitespace-nowrap font-medium text-xs sm:text-sm">
                              {format(new Date(log.timestamp), "d MMM yyyy HH:mm:ss", { locale: nl })}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {log.userEmail}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-lg hidden sm:inline">{getActionIcon(log.action)}</span>
                                <span className="text-xs sm:text-sm">{log.action}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm max-w-[200px] sm:max-w-none truncate">
                              {getActionDescription(log)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-gray-500">
                <p>
                  Totaal aantal activiteiten: {userLogs.length}
                </p>
                <p className="text-xs">
                  Activiteiten worden automatisch 30 dagen bewaard
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="border-b">
              <CardTitle className="text-red-600">Gebruiker Verwijderen</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg text-sm">
                  <p className="font-medium">Weet u zeker dat u deze gebruiker wilt verwijderen?</p>
                  <p className="mt-2">{deletingUser.email}</p>
                  <p className="mt-2 text-red-600">
                    Let op: Deze actie kan niet ongedaan worden gemaakt.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeletingUser(null)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    onClick={handleDeleteUser}
                    variant="destructive"
                  >
                    Verwijderen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}