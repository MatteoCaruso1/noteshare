import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BottomNavContextType {
  overrideActiveRoute: string | undefined;
  setOverrideActiveRoute: (route: string | undefined) => void;
}

const BottomNavContext = createContext<BottomNavContextType | undefined>(undefined);

export function BottomNavProvider({ children }: { children: ReactNode }) {
  const [overrideActiveRoute, setOverrideActiveRouteState] = useState<string | undefined>(undefined);

  const setOverrideActiveRoute = useCallback((route: string | undefined) => {
    setOverrideActiveRouteState(route);
  }, []);

  return (
    <BottomNavContext.Provider value={{ overrideActiveRoute, setOverrideActiveRoute }}>
      {children}
    </BottomNavContext.Provider>
  );
}

export function useBottomNavOverride() {
  const context = useContext(BottomNavContext);
  if (!context) {
    throw new Error('useBottomNavOverride must be used within a BottomNavProvider');
  }
  return context;
}
