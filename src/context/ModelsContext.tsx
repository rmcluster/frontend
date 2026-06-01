import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { getJson } from '../lib/api';
import { isModelCached as checkModelCached } from '../lib/modelCache';
import { apiRoutes } from '../lib/routes';
import type { Model, ModelCacheEntry } from '../types/ui';

type ModelsContextValue = {
  models: Model[];
  loading: boolean;
  refreshModels: () => Promise<{ models: Model[]; cache: ModelCacheEntry[] }>;
  isModelCached: (modelRef: string) => boolean;
};

const ModelsContext = createContext<ModelsContextValue | null>(null);

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Model[]>([]);
  const [cache, setCache] = useState<ModelCacheEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshModels = useCallback(async () => {
    const payload = await getJson<{ models: Model[]; cache: ModelCacheEntry[] }>(
      apiRoutes.uiModels
    );
    setModels(payload.models);
    setCache(payload.cache ?? []);
    return payload;
  }, []);

  const isModelCached = useCallback(
    (modelRef: string) => checkModelCached(modelRef, cache),
    [cache]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshModels();
      } catch {
        // ignore initial load errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshModels]);

  const value = useMemo(
    () => ({ models, loading, refreshModels, isModelCached }),
    [models, loading, refreshModels, isModelCached]
  );

  return (
    <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>
  );
}

export function useModels(): ModelsContextValue {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error('useModels must be used inside ModelsProvider');
  return ctx;
}
