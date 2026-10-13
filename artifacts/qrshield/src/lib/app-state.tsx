import { createContext, useContext, useState, type ReactNode } from 'react';
import type { GeneratedQr, TamperResult } from '@workspace/api-client-react';

type AppStateValue = {
  generated: GeneratedQr | null;
  setGenerated: (value: GeneratedQr | null) => void;
  modified: TamperResult | null;
  setModified: (value: TamperResult | null) => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [generated, setGenerated] = useState<GeneratedQr | null>(null);
  const [modified, setModified] = useState<TamperResult | null>(null);
  return (
    <AppStateContext.Provider value={{ generated, setGenerated, modified, setModified }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used within AppStateProvider');
  return value;
}
