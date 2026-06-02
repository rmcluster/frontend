import type { TunableSpec, TunablesSection as TunablesSectionData } from '../../types/ui';
import type { SettingsDraft } from './useTunablesState';

type TunableFieldProps = {
  spec: TunableSpec;
  value: string;
  onChange: (nextValue: string) => void;
};

function TunableField({ spec, value, onChange }: TunableFieldProps) {
  const step = spec.kind === 'int' ? 1 : 'any';

  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text-primary)]">{spec.label}</span>
      <div className="relative">
        <input
          type="number"
          min={spec.min}
          max={spec.max}
          step={step}
          inputMode={spec.kind === 'int' ? 'numeric' : 'decimal'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-focus)]${
            spec.unit ? ' pr-14' : ''
          }`}
        />
        {spec.unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-[var(--text-muted)]">
            {spec.unit}
          </span>
        ) : null}
      </div>
      {spec.description ? (
        <span className="text-xs text-[var(--text-muted)]">{spec.description}</span>
      ) : null}
    </label>
  );
}

type SaveStatusProps = {
  pending: boolean;
  error: string;
};

function SaveStatus({ pending, error }: SaveStatusProps) {
  if (!pending && !error) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-xl px-4 py-3 text-sm ${
        error
          ? 'border border-[var(--danger)]/30 bg-[var(--danger-dim)] text-[var(--danger)]'
          : 'border border-[var(--border)] bg-[var(--bg-surface)]/70 text-[var(--text-secondary)]'
      }`}
    >
      {error || 'Saving…'}
    </div>
  );
}

type TunablesPanelProps = {
  sections: TunablesSectionData[];
  draft: SettingsDraft;
  savePending: boolean;
  saveError: string;
  onTunableChange: (section: string, key: string, value: string) => void;
};

export function TunablesPanel({
  sections,
  draft,
  savePending,
  saveError,
  onTunableChange,
}: TunablesPanelProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/55 p-6">
      <div className="grid gap-6">
        {sections.map((section) => (
          <div key={section.key} className="grid gap-4">
            <div>
              <h4 className="text-sm font-medium text-[var(--text-primary)]">{section.label}</h4>
            </div>
            <div className="grid gap-5">
              {section.specs.map((spec) => (
                <TunableField
                  key={`${section.key}:${spec.key}`}
                  spec={spec}
                  value={draft[section.key]?.[spec.key] ?? ''}
                  onChange={(value) => onTunableChange(section.key, spec.key, value)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <SaveStatus pending={savePending} error={saveError} />
    </section>
  );
}
