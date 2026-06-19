import { Link, useNavigate } from "react-router";
import { ROUTES, APP_NAME } from "~/lib/constants";
import { Button } from "~/components/ui/button";
import { Avatar } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { Moon, Sun, LogOut, LayoutDashboard, FileText, Menu, X } from "lucide-react";
import { useTheme } from "~/stores/theme";
import { useState } from "react";

interface AppBarProps {
  userName?: string;
  userEmail?: string;
  userImage?: string | null;
  onLogout?: () => void;
}

export function AppBar({ userName, userEmail, userImage, onLogout }: AppBarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + nav */}
        <div className="flex items-center gap-6">
          <Link to={userName ? ROUTES.dashboard : ROUTES.home} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-bold text-zinc-900 dark:text-white">{APP_NAME}</span>
          </Link>

          {userName && (
            <nav className="hidden items-center gap-4 md:flex">
              <Link
                to={ROUTES.dashboard}
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Dashboard
              </Link>
              <Link
                to={ROUTES.projects}
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Projects
              </Link>
            </nav>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {userName ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar src={userImage} name={userName || "User"} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{userName}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{userEmail}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(ROUTES.dashboard)}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(ROUTES.projects)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Projects
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.login)}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate(ROUTES.register)}>
                Get Started
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          {userName && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && userName && (
        <div className="border-t border-zinc-200 bg-white px-4 pb-4 pt-2 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              to={ROUTES.dashboard}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Dashboard
            </Link>
            <Link
              to={ROUTES.projects}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Projects
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
