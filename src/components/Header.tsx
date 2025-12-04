import { Search, Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface HeaderProps {
  onAuthClick: () => void;
}

export function Header({ onAuthClick }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-jazz-gold to-jazz-amber shadow-lg group-hover:shadow-glow transition-shadow">
              <span className="text-xl">🎷</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-xl font-bold text-foreground leading-none">
                Jazz is Dead
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">
                The scene lives here
              </p>
            </div>
          </a>
        </div>

        {/* Search */}
        <div className={`relative flex-1 max-w-md transition-all duration-200 ${searchFocused ? 'max-w-lg' : ''}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search posts, artists, tags..."
            className="w-full pl-10 bg-secondary/50 border-border/50 focus:border-jazz-gold/50 focus:ring-jazz-gold/20"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="jazz" onClick={onAuthClick} className="hidden sm:flex">
            Sign In
          </Button>
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
