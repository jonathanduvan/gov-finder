// src/utils/fuzzyMatch.ts
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\.,]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Simple similarity based on substring inclusion; replace later with
 * a proper fuzzy library if needed.
 */
export function isLikelySame(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}
