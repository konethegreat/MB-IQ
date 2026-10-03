// Code written by Kone & Claude | The code does the following: " A tiny typed fetch wrapper for the
// MB IQ API. It attaches the stored JWT to every request, parses JSON, and surfaces API errors as
// thrown Errors so pages can show clean messages. Also exposes a helper to download PDF blobs. "

const BASE = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'mbiq_token';

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

// Code written by Kone & Claude | The code does the following: " Performs a JSON API request with the
// Bearer token attached, returning the parsed body or throwing on a non-2xx response. "
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Code written by Kone & Claude | The code does the following: " Requests a PDF from the API and
// triggers a browser download of the returned file blob. "
export async function downloadPdf(path: string, body: unknown, filename: string): Promise<void> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Could not generate the PDF report.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
