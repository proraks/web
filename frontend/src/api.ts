// Empty string = same-origin. In Docker/nginx the static site and /api/ share a
// host, so the browser talks to nginx which proxies to the backend. For a
// separate deployment (e.g. Vercel frontend + bare API), set VITE_API_URL.
const API_URL: string = import.meta.env.VITE_API_URL ?? "";

// Admin session token, kept in sessionStorage (auto-cleared when the tab closes)
// and sent as `Authorization: Bearer <token>` on every request. Works cross-site,
// unlike cookies (SameSite/third-party blocking).
const TOKEN_KEY = "auth_token";

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Matches the backend's `kind` and `status` enums as serialized by serde.
// The wire format is the verbatim Rust variant name ("Book", "Tbr", …).
// The backend's sqlx::Type rename_all="snake_case" only affects the Postgres
// enum values ('book', 'tbr', …) — never the JSON API.
export type Kind = "Book" | "ShortText" | "Article" | "Media";
export type Status = "Tbr" | "InProgress" | "Completed";

export interface EntryListItem {
  id: number;
  kind: Kind;
  title: string;
  author: string | null;
  language: string | null;
  completed_at: string | null;
  has_commentary: boolean;
  journal: string | null;
  article_url: string | null;
  media_url: string | null;
  rating: number | null;
}

export interface EntryListResponse {
  items: EntryListItem[];
  has_more: boolean;
}

export interface AdminEntryListItem {
  id: number;
  kind: Kind;
  title: string;
  author: string | null;
  language: string | null;
  status: Status;
  completed_at: string | null;
  has_commentary: boolean;
  rating: number | null;
}

export interface AdminEntryListResponse {
  items: AdminEntryListItem[];
  has_more: boolean;
}

export interface Entry {
  id: number;
  kind: Kind;
  title: string;
  author: string | null;
  language: string | null;
  status: Status;
  completed_at: string | null;
  created_at: string;
  edited_at: string;
  // Book
  isbn: string | null;
  pages: number | null;
  publisher: string | null;
  rating?: number | null;
  // ShortText
  doi: string | null;
  short_text_url: string | null;
  // Article
  journal: string | null;
  issue: string | null;
  article_url: string | null;
  // Media
  media_subtype: "Video" | "Audio" | null;
  media_url: string | null;
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
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
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
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Public ----

export function listEntries(params: {
  kind?: Kind;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<EntryListResponse> {
  const search = new URLSearchParams();
  if (params.kind) search.set("kind", params.kind);
  if (params.q) search.set("q", params.q);
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  if (typeof params.offset === "number") search.set("offset", String(params.offset));
  const qs = search.toString();
  return request(`/api/entries${qs ? `?${qs}` : ""}`);
}

export function getEntry(id: number): Promise<EntryDetail> {
  return request(`/api/entries/${id}`);
}

// ---- Admin ----

export interface LoginResponse {
  token: string;
  expires_at?: number;
}

export async function login(password: string): Promise<void> {
  const res = await request<LoginResponse>("/api/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  sessionStorage.setItem(TOKEN_KEY, res.token);
}

export function logout(): Promise<void> {
  sessionStorage.removeItem(TOKEN_KEY);
  return request("/api/logout", { method: "POST" });
}

export function adminGetEntry(id: number): Promise<EntryDetail> {
  return request(`/api/admin/entries/${id}`);
}

export function adminListEntries(params: {
  status?: Status;
  kind?: Kind;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<AdminEntryListResponse> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.kind) search.set("kind", params.kind);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  if (typeof params.offset === "number") search.set("offset", String(params.offset));
  const qs = search.toString();
  return request(`/api/admin/entries${qs ? `?${qs}` : ""}`);
}

export interface NewEntryInput {
  kind: Kind;
  title: string;
  author?: string;
  language?: string;
  status?: Status;
  // Book
  isbn?: string;
  pages?: number;
  publisher?: string;
  // ShortText
  doi?: string;
  short_text_url?: string;
  // Article
  journal?: string;
  issue?: string;
  article_url?: string;
  // Media
  media_subtype?: "Video" | "Audio";
  media_url?: string;
}

export function createEntry(input: NewEntryInput): Promise<{ id: number }> {
  return request("/api/admin/entries", { method: "POST", body: JSON.stringify(input) });
}

export function updateEntry(id: number, input: Partial<NewEntryInput> & { completed_at?: string }) {
  return request(`/api/admin/entries/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function upsertCommentary(entryId: number, title: string, body: string, isPublished: boolean) {
  return request(`/api/admin/entries/${entryId}/commentary`, {
    method: "PUT",
    body: JSON.stringify({ title, body, is_published: isPublished }),
  });
}
