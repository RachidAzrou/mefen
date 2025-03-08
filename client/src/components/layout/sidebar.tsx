import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Calendar,
  Package2, LogOut, Menu, ChevronLeft, ChevronRight,
  Settings, FileJson, User, House, Radio
} from "lucide-react";
import { PiMosqueLight, PiUsersThree } from "react-icons/pi";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRole } from "@/hooks/use-role";
import { useNotifications } from "@/hooks/use-notifications";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isAdmin } = useRole();
  const { unreadCount, clearUnreadCount } = useNotifications();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      const userEmail = auth.currentUser?.email;
      await signOut(auth);
      await logUserAction(
        UserActionTypes.LOGOUT,
        undefined,
        {
          type: "auth",
          id: userEmail || 'unknown',
          name: userEmail || 'unknown'
        }
      );
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Calendar, label: "Planning", href: "/planning" },
    { icon: Users, label: "Vrijwilligers", href: "/volunteers" },
    { icon: Package2, label: "Materialen", href: "/materials" },
    { icon: Radio, label: "Communicatie", href: "/communication" },
    {
      icon: FileJson,
      label: "Import/Export",
      href: "/import-export",
      notificationCount: unreadCount
    },
    { icon: PiMosqueLight, label: "Mijn Moskee", href: "/mosque" },
    { icon: House, label: "Ruimtes", href: "/rooms", adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile menu backdrop */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[998] transition-opacity duration-300"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Mobile menu button */}
      {isMobile && collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-[999] md:hidden w-12 h-12 rounded-full bg-white shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-200"
          onClick={() => setCollapsed(false)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}

      {/* Sidebar container */}
      <div
        className={cn(
          "fixed md:sticky top-0 flex flex-col border-r bg-white/95 backdrop-blur-sm transition-transform duration-300 ease-in-out h-[100dvh] z-[999]",
          collapsed ? (isMobile ? "-translate-x-full" : "w-16") : "w-[280px] sm:w-64",
          isMobile && "shadow-xl"
        )}
      >
        {/* Logo section */}
        <div className="flex h-32 items-center justify-center bg-white border-b relative">
          {!collapsed && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src="/static/Naamloos.png"
                alt="MEFEN"
                className="w-full h-full object-contain transition-opacity duration-200"
              />
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          )}
        </div>

        {/* Profile section */}
        <Link href="/profile">
          <div className={cn(
            "border-b p-4 cursor-pointer hover:bg-gray-50/80 transition-all duration-200",
            collapsed ? "text-center" : ""
          )}>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2 inline-flex">
                <User className="h-5 w-5 text-primary" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {currentUser?.displayName || currentUser?.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isAdmin ? "Administrator" : "Gebruiker"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Menu items */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.href === '/import-export') {
                    clearUnreadCount();
                  }
                  if (isMobile) {
                    setCollapsed(true);
                  }
                }}
              >
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-14 md:h-12 relative transition-all duration-200",
                    location === item.href
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "hover:bg-primary/5 hover:text-primary",
                    collapsed && "justify-center",
                    isMobile && !collapsed && "text-base"
                  )}
                >
                  {React.createElement(item.icon, {
                    className: cn(
                      "h-6 w-6 md:h-5 md:w-5 transition-colors duration-200",
                      location === item.href ? "text-primary" : "text-gray-500"
                    )
                  })}
                  {!collapsed && (
                    <span className={cn(
                      "ml-3 transition-opacity duration-200",
                      isMobile && "text-base font-medium"
                    )}>
                      {item.label}
                    </span>
                  )}
                  {item.notificationCount > 0 && (
                    <span className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 bg-primary/20 text-primary rounded-full px-2 py-0.5 min-w-[1.5rem] text-center text-sm transition-all duration-200",
                      collapsed && "right-1"
                    )}>
                      {item.notificationCount}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>

        {/* Footer section */}
        <div className="p-2 border-t space-y-2">
          {isAdmin && (
            <Link href="/settings">
              <Button
                variant={location === "/settings" ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-14 md:h-12 transition-all duration-200",
                  location === "/settings"
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "hover:bg-primary/5 hover:text-primary",
                  collapsed && "justify-center"
                )}
                onClick={() => isMobile && setCollapsed(true)}
              >
                <Settings className="h-6 w-6 md:h-5 md:w-5" />
                {!collapsed && (
                  <span className="ml-3">Instellingen</span>
                )}
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-14 md:h-12 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200",
              collapsed && "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-6 w-6 md:h-5 md:w-5" />
            {!collapsed && (
              <span className="ml-3">Afmelden</span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}