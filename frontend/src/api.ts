// Empty string = same-origin. In Docker/nginx the static site and /api/ share a
// host, so the browser talks to nginx which proxies to the backend. For a
// separate deployment (e.g. Vercel frontend + bare API), set VITE_API_URL.
const API_URL: string = import.meta.env.VITE_API_URL ?? "";

// Matches the backend's `kind` enum: 'book' was renamed to 'long_text' in
// migration 002, and 'video' was added.
export type Kind = "long_text" | "short_text" | "video";
export type Status = "to_read" | "reading" | "read";

export interface EntryListItem {
  id: number;
  kind: Kind;
  title: string;
  author: string | null;
  language: string | null;
  year_published: number | null;
  read_at: string | null;
  has_commentary: boolean;
}

export interface Entry {
  id: number;
  kind: Kind;
  title: string;
  author: string | null;
  language: string | null;
  year_written: number | null;
  year_published: number | null;
  image_url: string | null;
  status: Status;
  read_at: string | null;
  created_at: string;
  edited_at: string;
}

export interface Commentary {
  id: number;
  entry_id: number;
  title: string | null;
  body: string | null;
  is_published: boolean;
  created_at: string;
  edited_at: string;
}

export interface EntryDetail extends Entry {
  commentary: Commentary | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include", // sends the admin session cookie
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON, keep the generic message
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Public ----

export function listEntries(kind?: Kind): Promise<EntryListItem[]> {
  const qs = kind ? `?kind=${kind}` : "";
  return request(`/api/entries${qs}`);
}

export function getEntry(id: number): Promise<EntryDetail> {
  return request(`/api/entries/${id}`);
}

// ---- Admin ----

export function login(password: string): Promise<void> {
  return request("/api/login", { method: "POST", body: JSON.stringify({ password }) });
}

export function logout(): Promise<void> {
  return request("/api/logout", { method: "POST" });
}

export function adminGetEntry(id: number): Promise<EntryDetail> {
  return request(`/api/admin/entries/${id}`);
}

export function adminListEntries(status?: Status): Promise<Entry[]> {
  const qs = status ? `?status=${status}` : "";
  return request(`/api/admin/entries${qs}`);
}

export interface NewEntryInput {
  kind: Kind;
  title: string;
  author?: string;
  language?: string;
  year_written?: number;
  year_published?: number;
  image_url?: string;
  status?: Status;
}

export function createEntry(input: NewEntryInput): Promise<{ id: number }> {
  return request("/api/admin/entries", { method: "POST", body: JSON.stringify(input) });
}

export function updateEntry(id: number, input: Partial<NewEntryInput> & { read_at?: string }) {
  return request(`/api/admin/entries/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function upsertCommentary(entryId: number, title: string, body: string, isPublished: boolean) {
  return request(`/api/admin/entries/${entryId}/commentary`, {
    method: "PUT",
    body: JSON.stringify({ title, body, is_published: isPublished }),
  });
}
