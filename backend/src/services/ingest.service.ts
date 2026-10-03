// Code written by Kone & Claude | The code does the following: " Document ingestion. Turns imported
// content into plain text the documentation engine can store and index: pasted text/markdown/code is
// used directly; uploaded files arrive as base64 and are decoded (PDF is parsed with a lazily-imported
// pdf-parse so the core build never depends on it). Returns extracted text plus a detected kind. "

export interface IngestInput { text?: string; contentBase64?: string; mimeType?: string; filename?: string }

export async function extractText(input: IngestInput): Promise<{ text: string; detected: string }> {
  if (input.text && input.text.trim()) return { text: input.text, detected: 'text' };

  if (input.contentBase64) {
    const buf = Buffer.from(input.contentBase64, 'base64');
    const name = (input.filename ?? '').toLowerCase();
    const isPdf = (input.mimeType ?? '').includes('pdf') || name.endsWith('.pdf');
    if (isPdf) {
      try {
        // Lazy, non-literal import so TypeScript doesn't require the optional dep at build time.
        const moduleName = 'pdf-parse';
        const mod = (await import(moduleName)) as unknown as { default: (b: Buffer) => Promise<{ text: string }> };
        const parsed = await mod.default(buf);
        return { text: parsed.text.trim(), detected: 'pdf' };
      } catch {
        return { text: '[Could not parse PDF. Ensure `pdf-parse` is installed (npm install).]', detected: 'pdf-error' };
      }
    }
    // Markdown / text / source code
    return { text: buf.toString('utf-8'), detected: 'text' };
  }

  return { text: '', detected: 'empty' };
}
