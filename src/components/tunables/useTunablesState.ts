import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTunables, setTunables } from '../../lib/api';
import type { TunableSpec, TunablesSection } from '../../types/ui';

export type SectionDraft = Record<string, string>;
export type TunablesDraft = Record<string, SectionDraft>;
export type SettingsDraft = TunablesDraft;

export type TunablesState = {
  sections: TunablesSection[];
  draft: SettingsDraft;
  saved: SettingsDraft;
  loading: boolean;
  savePending: boolean;
  loadError: string;
  saveError: string;
};

export type TunablesActions = {
  updateTunable: (section: string, key: string, value: string) => void;
};

const SAVE_DEBOUNCE_MS = 450;

function maybeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to save settings.';
}

function valuesToDraft(values: Record<string, number>): SectionDraft {
  const draft: SectionDraft = {};
  for (const [key, value] of Object.entries(values)) {
    draft[key] = String(value);
  }
  return draft;
}

function sectionsToDraft(sections: TunablesSection[]): SettingsDraft {
  const draft: SettingsDraft = {};
  for (const section of sections) {
    draft[section.key] = valuesToDraft(section.values);
  }
  return draft;
}

function draftToPayload(
  draft: SectionDraft | undefined,
  saved: SectionDraft | undefined
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const [key, raw] of Object.entries(draft ?? {})) {
    if (raw === (saved ?? {})[key]) {
      continue;
    }
    values[key] = Number(raw);
  }
  return values;
}

function specsBySection(sections: TunablesSection[]): Record<string, TunableSpec[]> {
  const bySection: Record<string, TunableSpec[]> = {};
  for (const section of sections) {
    bySection[section.key] = section.specs;
  }
  return bySection;
}

function sameDraft(a: SettingsDraft, b: SettingsDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useTunablesState(open: boolean): TunablesState & TunablesActions {
  const [sections, setSections] = useState<TunablesSection[]>([]);
  const [draft, setDraft] = useState<SettingsDraft>({});
  const [saved, setSaved] = useState<SettingsDraft>({});
  const [loading, setLoading] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  const sectionSpecs = useMemo(() => specsBySection(sections), [sections]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setSaveError('');

    try {
      const response = await getTunables();
      const nextDraft = sectionsToDraft(response.sections);
      setSections(response.sections);
      setDraft(nextDraft);
      setSaved(nextDraft);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadSettings();
  }, [open, loadSettings]);

  const validateDraft = useCallback(
    (value: SettingsDraft): string | null => {
      for (const [sectionKey, specs] of Object.entries(sectionSpecs)) {
        for (const spec of specs) {
          const raw = value[sectionKey]?.[spec.key];
          if (raw === undefined) {
            continue;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) {
            return `${spec.label} must be a number.`;
          }
          if (spec.kind === 'int' && !Number.isInteger(parsed)) {
            return `${spec.label} must be a whole number.`;
          }
          if (spec.min !== undefined && parsed < spec.min) {
            return `${spec.label} must be >= ${spec.min}.`;
          }
          if (spec.max !== undefined && parsed > spec.max) {
            return `${spec.label} must be <= ${spec.max}.`;
          }
        }
      }
      return null;
    },
    [sectionSpecs]
  );

  const saveDraft = useCallback(
    async (value: SettingsDraft) => {
      const validationError = validateDraft(value);
      if (validationError) {
        setSaveError(validationError);
        return;
      }

      setSavePending(true);

      try {
        const nextSections = [...sections];
        const nextSaved: SettingsDraft = { ...saved };

        for (const section of sections) {
          const values = draftToPayload(value[section.key], saved[section.key]);
          if (Object.keys(values).length === 0) {
            continue;
          }
          const updated = await setTunables(section.key, values);
          const index = nextSections.findIndex((candidate) => candidate.key === section.key);
          if (index >= 0) {
            nextSections[index] = updated;
          }
          nextSaved[section.key] = valuesToDraft(updated.values);
        }

        setSections(nextSections);
        setDraft(nextSaved);
        setSaved(nextSaved);
        setSaveError('');
      } catch (error) {
        setSaveError(maybeErrorMessage(error));
      } finally {
        setSavePending(false);
      }
    },
    [saved, sections, validateDraft]
  );

  useEffect(() => {
    if (!open || loading || savePending || loadError) {
      return;
    }
    if (sameDraft(draft, saved)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveDraft(draft);
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [open, loading, savePending, loadError, draft, saved, saveDraft]);

  const updateTunable = useCallback((section: string, key: string, value: string) => {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...(current[section] ?? {}),
        [key]: value,
      },
    }));
  }, []);

  return {
    sections,
    draft,
    saved,
    loading,
    savePending,
    loadError,
    saveError,
    updateTunable,
  };
}
