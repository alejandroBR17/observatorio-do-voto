export function resultLink(base: string, values: Record<string, string | number | undefined>) {
  const url = new URL('/', base);
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  return url.href;
}
