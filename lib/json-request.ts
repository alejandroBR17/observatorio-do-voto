export async function limitedJson(
  req: Request,
  maxBytes = 8192,
): Promise<Record<string, unknown> | null | Response> {
  const length = Number(req.headers.get('content-length'));
  if (length > maxBytes) return tooLarge();
  const reader = req.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let bytes = 0,
    text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return tooLarge();
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    const value: unknown = JSON.parse(text + decoder.decode());
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
function tooLarge() {
  return Response.json(
    { error: 'Os dados enviados excedem o limite permitido.' },
    { status: 413, headers: { 'Cache-Control': 'no-store' } },
  );
}
