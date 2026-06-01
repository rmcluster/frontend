import type { Model, ModelCacheEntry } from '../types/ui';

const HF_QUANT_HINT =
  /(?:q\d(?:_[a-z0-9]+)*|awq|gptq|fp16|fp8|bf16|int4|int8)/i;

export type ModelCacheStatus = 'ready' | 'not_cached' | 'prefetching';

export function parseHFModelRef(
  name: string
): { repo: string; variant: string } | null {
  if (!name.startsWith('hf:')) return null;
  const trimmed = name.slice(3);
  const colon = trimmed.indexOf(':');
  if (colon === -1) {
    const repo = trimmed.trim();
    return repo ? { repo, variant: '' } : null;
  }
  const repo = trimmed.slice(0, colon).trim();
  const variant = trimmed.slice(colon + 1).trim();
  return repo ? { repo, variant } : null;
}

export function hfRepoFromModelRef(modelRef: string): string | null {
  return parseHFModelRef(modelRef)?.repo ?? null;
}

function normalizeQuantToken(value: string): string {
  let v = value.trim().replace(/\.gguf$/i, '');
  v = v.replace(/^UD-/i, '');
  return v.toUpperCase();
}

function quantFromHFVariant(variant: string): string {
  const value = variant.trim();
  if (!value) return '';
  const withoutExt = value.replace(/\.gguf$/i, '');
  const match = withoutExt.match(HF_QUANT_HINT);
  return normalizeQuantToken(match?.[0] ?? withoutExt);
}

function buildCacheIndex(cache: ModelCacheEntry[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const entry of cache) {
    const repo = entry.repo.trim();
    const quant = normalizeQuantToken(entry.quant);
    if (!repo || !quant) continue;
    let quants = index.get(repo);
    if (!quants) {
      quants = new Set();
      index.set(repo, quants);
    }
    quants.add(quant);
  }
  return index;
}

/** True when the model weights are available locally (HF cache hit or non-HF library entry). */
export function isModelCached(
  modelRef: string,
  cache: ModelCacheEntry[]
): boolean {
  const parsed = parseHFModelRef(modelRef);
  if (parsed) {
    const index = buildCacheIndex(cache);
    const quants = index.get(parsed.repo);
    if (!quants || quants.size === 0) return false;
    const quant = quantFromHFVariant(parsed.variant);
    if (!quant) return true;
    return quants.has(quant);
  }
  // Custom local paths and builtins are listed only when configured on the host.
  return modelRef.trim() !== '';
}

export function modelCacheStatusLabel(status: ModelCacheStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'prefetching':
      return 'Downloading';
    default:
      return 'Not cached';
  }
}
