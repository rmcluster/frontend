import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getJson } from '../lib/api';
import { apiRoutes } from '../lib/routes';
import type { Model } from '../types/ui';

type ModelsContextValue = {
  models: Model[];
};

const ModelsContext = createContext<ModelsContextValue | null>(null);

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Model[]>([]);

  const fetchModels = useCallback(() => {
    void getJson<{ models: Model[] }>(apiRoutes.uiModels)
      .then((p) => setModels(p.models))
      .catch(() => undefined);
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  return (
    <ModelsContext.Provider value={{ models }}>
      {children}
    </ModelsContext.Provider>
  );
}

export function useModels(): ModelsContextValue {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error('useModels must be used inside ModelsProvider');
  return ctx;
}
