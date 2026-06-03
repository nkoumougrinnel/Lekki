import { User } from '@/types/wiki';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sparkles, Menu, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  user: User;
  currentPage: 'dashboard' | 'editor' | 'search' | 'access';
  onNavigate: (page: 'dashboard' | 'editor' | 'search' | 'access') => void;
  onLogout: () => void;
}

export function Header({
  user,
  currentPage,
  onNavigate,
  onLogout,
}: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            <Menu size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="text-lg font-bold text-foreground hidden sm:inline">Lekki</span>
          </div>
        </div>

        {/* Center - Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <Button
            variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('dashboard')}
            className={currentPage === 'dashboard' ? 'bg-emerald-600 text-white' : ''}
          >
            Dashboard
          </Button>
          <Button
            variant={currentPage === 'search' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('search')}
            className={currentPage === 'search' ? 'bg-emerald-600 text-white' : ''}
          >
            <Sparkles size={16} className="mr-2" />
            Search
          </Button>
          <Button
            variant={currentPage === 'access' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onNavigate('access')}
            className={currentPage === 'access' ? 'bg-emerald-600 text-white' : ''}
          >
            Access Control
          </Button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden sm:flex items-center gap-2 bg-smoke rounded-lg px-3 py-2 flex-1 max-w-xs">
            <Sparkles size={16} className="text-emerald-600" />
            <Input
              placeholder="Search..."
              className="bg-transparent border-0 focus:ring-0 text-sm"
            />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full">
                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-sm font-semibold">
                  {user.avatar}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2">
                <UserIcon size={16} />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <Settings size={16} />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
                className="flex items-center gap-2 text-rose-600"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
