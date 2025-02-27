import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Walkthrough } from "@/components/walkthrough.tsx";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Profile from "@/pages/profile";
import Volunteers from "@/pages/volunteers";
import Rooms from "@/pages/rooms";
import Materials from "@/pages/materials";
import Planning from "@/pages/planning";
import PublicCalendar from "@/pages/public-calendar";
import ImportExport from "@/pages/import-export";
import Mosque from "@/pages/mosque";
import Settings from "@/pages/settings";
import Communication from "@/pages/communication"; // Added import
import { Sidebar } from "@/components/layout/sidebar";
import { auth } from "./lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNotifications } from "@/hooks/use-notifications";
import React from 'react';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { permission, requestPermission } = useNotifications();

  React.useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  return (
    <div className="flex min-h-[100dvh] bg-gray-50/80 relative">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-4 md:p-6 w-full max-w-screen overflow-x-hidden pt-20 md:pt-6">
        <div className="container mx-auto max-w-7xl">
          {children}
        </div>
      </main>
      <Walkthrough />
    </div>
  );
}

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#963E56] mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return (
    <AuthenticatedLayout>
      <Component />
    </AuthenticatedLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={() => <PrivateRoute component={Dashboard} />} />
      <Route path="/profile" component={() => <PrivateRoute component={Profile} />} />
      <Route path="/planning" component={() => <PrivateRoute component={Planning} />} />
      <Route path="/volunteers" component={() => <PrivateRoute component={Volunteers} />} />
      <Route path="/rooms" component={() => <PrivateRoute component={Rooms} />} />
      <Route path="/materials" component={() => <PrivateRoute component={Materials} />} />
      <Route path="/import-export" component={() => <PrivateRoute component={ImportExport} />} />
      <Route path="/mosque" component={() => <PrivateRoute component={Mosque} />} />
      <Route path="/settings" component={() => <PrivateRoute component={Settings} />} />
      <Route path="/communication" component={() => <PrivateRoute component={Communication} />} /> {/* Added route */}
      <Route path="/calendar/public" component={PublicCalendar} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;