export class NoTokensError extends Error {
  constructor() {
    super('no_tokens');
    this.name = 'NoTokensError';
  }
}

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(body || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function readError(r: Response): Promise<string> {
  try {
    const txt = await r.text();
    try {
      const parsed = JSON.parse(txt);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed === 'object') {
        const detail = (parsed as Record<string, unknown>).detail;
        if (typeof detail === 'string') return detail;
        if (detail && typeof detail === 'object') {
          const inner = (detail as Record<string, unknown>).detail;
          if (typeof inner === 'string') return inner;
        }
        const error = (parsed as Record<string, unknown>).error;
        if (typeof error === 'string') return error;
        return JSON.stringify(parsed);
      }
      return txt;
    } catch {
      return txt;
    }
  } catch {
    return '';
  }
}

async function ensureOk(r: Response): Promise<Response> {
  if (r.status === 503) {
    const body = await readError(r);
    if (body.includes('no_tokens')) throw new NoTokensError();
    throw new ApiError(r.status, body);
  }
  if (!r.ok) {
    const body = await readError(r);
    throw new ApiError(r.status, body);
  }
  return r;
}

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(path, { headers: { Accept: 'application/json' } });
  await ensureOk(r);
  return (await r.json()) as T;
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  await ensureOk(r);
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

export async function patchJSON<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  await ensureOk(r);
  return (await r.json()) as T;
}

export async function del(path: string): Promise<void> {
  const r = await fetch(path, { method: 'DELETE' });
  await ensureOk(r);
}

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  const r = await fetch(path, { method: 'POST', body: form });
  await ensureOk(r);
  return (await r.json()) as T;
}
