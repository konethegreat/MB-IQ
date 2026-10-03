// Code written by Kone & Claude | The code does the following: " Client helper that turns a Markdown
// artifact into a downloadable PDF. It finds each ```mermaid block, rasterises it to a PNG via the shared
// Mermaid helper, replaces the block with an image placeholder, and posts the markdown + PNGs to the
// backend PDF renderer (which has no headless-browser dependency). Used by Reports and the Diagrams page. "

import { mermaidToPngDataUrl } from './Mermaid';
import { tokenStore } from '../api/client';

const BASE = import.meta.env.VITE_API_URL ?? '';

// Code written by Kone & Claude | The code does the following: " Replaces fenced mermaid blocks with image
// placeholders and rasterises each to a PNG, returning the rewritten markdown + the image set. "
export async function rasterifyMermaid(markdown: string): Promise<{ markdown: string; images: { id: string; dataUrl: string }[] }> {
  const blocks: { id: string; code: string }[] = [];
  const rewritten = markdown.replace(/```mermaid\s*([\s\S]*?)```/g, (_m, code: string) => {
    const id = `d${blocks.length}`;
    blocks.push({ id, code: code.trim() });
    return `\n\n![Diagram](mbiq-diagram:${id})\n\n`;
  });

  const images: { id: string; dataUrl: string }[] = [];
  for (const b of blocks) {
    try { const { dataUrl } = await mermaidToPngDataUrl(b.code); images.push({ id: b.id, dataUrl }); }
    catch { /* skip a diagram that fails to rasterise; the placeholder degrades gracefully in the PDF */ }
  }
  return { markdown: rewritten, images };
}

// Code written by Kone & Claude | The code does the following: " Generates and downloads an on-brand PDF
// for a Markdown artifact (rasterising any diagrams first), via POST /api/ai/report/pdf. "
export async function downloadArtifactPdf(opts: { title: string; subtitle?: string; markdown: string; filename: string }): Promise<void> {
  const { markdown, images } = await rasterifyMermaid(opts.markdown);
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/api/ai/report/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ title: opts.title, subtitle: opts.subtitle, markdown, images }),
  });
  if (!res.ok) throw new Error('Could not generate the PDF.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename;
  a.click();
  URL.revokeObjectURL(url);
}
