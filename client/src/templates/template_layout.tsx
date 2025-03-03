import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  Home,
  LogOut,
  Settings,
  User,
} from "lucide-react";

interface NavItemProps {
  icon: React.ReactNode;
  title: string;
  href: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  children?: {
    title: string;
    href: string;
  }[];
}

function NavItem({
  icon,
  title,
  href,
  isActive,
  isCollapsed,
  children,
}: NavItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (children) {
    return (
      <div className={cn("flex flex-col")}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between px-2",
            isActive && "bg-primary/10 text-primary",
            isCollapsed && "justify-center px-2"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
            {icon}
            {!isCollapsed && <span>{title}</span>}
          </div>
          {!isCollapsed && (
            <div className="ml-auto">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
        </Button>
        {isOpen && !isCollapsed && (
          <div className="ml-6 mt-2 flex flex-col gap-2">
            {children.map((child) => (
              <a
                key={child.href}
                href={child.href}
                className={cn(
                  "text-sm text-muted-foreground hover:text-primary",
                  isActive && "text-primary"
                )}
              >
                {child.title}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "w-full justify-start px-2",
        isActive && "bg-primary/10 text-primary",
        isCollapsed && "justify-center px-2"
      )}
    >
      <a href={href} className="flex items-center gap-3">
        {icon}
        {!isCollapsed && <span>{title}</span>}
      </a>
    </Button>
  );
}

interface TemplateLayoutProps {
  children: React.ReactNode;
  navigation: {
    title: string;
    href: string;
    icon: React.ReactNode;
    children?: {
      title: string;
      href: string;
    }[];
  }[];
}

export function TemplateLayout({ children, navigation }: TemplateLayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r bg-card",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-3">
          {!isCollapsed && (
            <span className="text-lg font-semibold text-primary">AppNaam</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 p-2">
            {navigation.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </ScrollArea>
        <div className="border-t p-2">
          <NavItem
            href="/settings"
            icon={<Settings className="h-4 w-4" />}
            title="Instellingen"
            isCollapsed={isCollapsed}
          />
          <NavItem
            href="/profile"
            icon={<User className="h-4 w-4" />}
            title="Profiel"
            isCollapsed={isCollapsed}
          />
          <NavItem
            href="/logout"
            icon={<LogOut className="h-4 w-4" />}
            title="Uitloggen"
            isCollapsed={isCollapsed}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
