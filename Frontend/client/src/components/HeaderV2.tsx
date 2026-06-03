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
import { Sparkles, Moon, Sun, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderV2Props {
  user: User;
  onLogout: () => void;
}

export function HeaderV2({ user, onLogout }: HeaderV2Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-background border-b border-border sticky top-0 z-40">
      <div className="flex items-center px-6 py-4 gap-4">
        {/* Left - Empty for balance */}
        <div className="flex-1" />

        {/* Center - Search Bar */}
        <div className="w-full max-w-md flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
          <Sparkles size={16} className="text-primary flex-shrink-0" />
          <Input
            placeholder="Search or ask..."
            className="bg-transparent border-0 focus:ring-0 text-sm"
          />
        </div>

        {/* Right - Theme Toggle & User Menu */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="rounded-lg"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon size={18} />
            ) : (
              <Sun size={18} />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                  {user.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
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
                className="flex items-center gap-2 text-destructive"
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
