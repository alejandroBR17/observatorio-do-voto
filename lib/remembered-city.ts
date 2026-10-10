import { states } from './elections';

export type RememberedCity = { version: 1; uf: string; code: string; name: string };

export function rememberedCity(raw: string | null): RememberedCity | null {
  try {
    const value = JSON.parse(raw || 'null');
    if (
      value?.version !== 1 ||
      !states.some((s) => s[1] === value.uf) ||
      typeof value.code !== 'string' ||
      !/^\d{5}$/.test(value.code) ||
      typeof value.name !== 'string' ||
      !value.name.trim() ||
      value.name.length > 100
    )
      return null;
    return { version: 1, uf: value.uf, code: value.code, name: value.name.trim() };
  } catch {
    return null;
  }
}
