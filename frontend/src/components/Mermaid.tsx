// Code written by Kone & Claude | The code does the following: " Shared Mermaid renderer. Turns Mermaid
// diagram source into an SVG (themed to the MB IQ navy/lime identity), catches syntax errors so one bad
// diagram never breaks the page (it shows the error + the source instead), and exposes a helper that
// rasterises a diagram to a PNG data URL so the PDF pipeline can embed diagrams without a headless browser. "

import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

let initialized = false;
// Code written by Kone & Claude | The code does the following: " One-time Mermaid init with the MB IQ
// palette; securityLevel 'strict' sanitises the generated SVG so it is safe to inject. "
function ensureInit(): void {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: {
      primaryColor: '#eef6d6',
      primaryBorderColor: '#ADD135',
      primaryTextColor: '#071B33',
      secondaryColor: '#e6eef6',
      lineColor: '#36506e',
      fontFamily: 'inherit',
    },
  });
  initialized = true;
}

function uniqueRenderId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// Code written by Kone & Claude | The code does the following: " Renders Mermaid source to an inline SVG,
// re-rendering whenever the source changes and surfacing parse errors gracefully. "
export function Mermaid({ code }: { code: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    let cancelled = false;
    const src = (code || '').trim();
    if (!src) { setSvg(''); setError(''); return; }
    ensureInit();
    mermaid
      .render(uniqueRenderId(`m${reactId}`), src)
      .then(({ svg: out }) => { if (!cancelled) { setSvg(out); setError(''); } })
      .catch((e) => { if (!cancelled) { setSvg(''); setError((e as Error).message || 'Could not render diagram.'); } });
    return () => { cancelled = true; };
  }, [code, reactId]);

  if (error) {
    return (
      <div className="mermaid-error">
        <p className="small"><b>Diagram could not be rendered.</b> {error}</p>
        <pre className="summary-box">{code}</pre>
      </div>
    );
  }
  if (!svg) return <div className="mermaid-loading muted small">Rendering diagram…</div>;
  return <div className="mermaid-figure" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// Code written by Kone & Claude | The code does the following: " Rasterises Mermaid source to a PNG data
// URL (white background, retina scale) by rendering to SVG, sizing it from its viewBox, and drawing it to
// a canvas. The PDF endpoint embeds the returned PNG, so diagrams appear in reports with no server-side
// browser dependency. "
export async function mermaidToPngDataUrl(code: string, scale = 2): Promise<{ dataUrl: string; width: number; height: number }> {
  ensureInit();
  const { svg } = await mermaid.render(uniqueRenderId('pdf'), code.trim());
  const svgEl = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;

  let w = parseFloat(svgEl.getAttribute('width') || '');
  let h = parseFloat(svgEl.getAttribute('height') || '');
  const vb = (svgEl.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  if ((!w || !h) && vb.length === 4) { w = vb[2]; h = vb[3]; }
  if (!w || !h) { w = 800; h = 600; }
  svgEl.setAttribute('width', String(w));
  svgEl.setAttribute('height', String(h));

  const serialized = new XMLSerializer().serializeToString(svgEl);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Diagram image failed to load.'));
    img.src = svgUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/png'), width: w, height: h };
}
