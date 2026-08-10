import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminListEntries, updateEntry } from "../api";
import type { AdminEntryListItem, Kind, Status } from "../api";
import { useAdmin } from "../AdminContext";
import { flagFor } from "../languages";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<Status, string> = {
  Tbr: "ootel",
  InProgress: "pooleli",
  Completed: "lõpetatud",
};

const KIND_LABEL: Record<Kind, string> = {
  Book: "raamat",
  ShortText: "lühitekst",
  Article: "artikkel",
  Media: "meedia",
};

const KIND_ORDER: Kind[] = ["Book", "ShortText", "Article", "Media"];
const STATUS_ORDER: Status[] = ["Tbr", "InProgress", "Completed"];

type SortField = "completed_at" | "title" | "kind" | "author" | "language" | "status";

function renderStars(rating: number | null) {
  if (!rating) {
    return <span style={{ color: "var(--ink-soft)", opacity: 0.55 }}>☆☆☆☆☆</span>;
  }
  return (
    <span aria-label={`Hinnang ${rating} / 5`} title={`${rating} / 5`}>
      <span style={{ color: "var(--accent)" }}>{"★★★★★".slice(0, rating)}</span>
      <span style={{ color: "var(--ink-soft)", opacity: 0.45 }}>{"★★★★★".slice(rating)}</span>
    </span>
  );
}

export default function AdminDashboardPage() {
  const [entries, setEntries] = useState<AdminEntryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<Status | undefined>(undefined);
  const [kindFilter, setKindFilter] = useState<Kind | undefined>(undefined);
  const [sort, setSort] = useState<SortField>("completed_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setIsAdmin } = useAdmin();
  const navigate = useNavigate();

  async function loadPage(nextOffset = 0, append = false) {
    const request = adminListEntries({
      status: statusFilter,
      kind: kindFilter,
      sort,
      order,
      limit: PAGE_SIZE,
      offset: nextOffset,
    });

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await request;
      setIsAdmin(true);
      setEntries((prev) => (append ? [...prev, ...data.items] : data.items));
      setHasMore(data.has_more);
      setOffset(nextOffset);
    } catch (e) {
      const status = e instanceof Error ? (e as Error & { status?: number }).status : undefined;
      if (status === 401 || status === 403) {
        setIsAdmin(false);
        navigate("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "Laadimine ebaõnnestus");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void loadPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, kindFilter, sort, order]);

  const counts = useMemo(() => {
    const map: Record<Status, number> = { Tbr: 0, InProgress: 0, Completed: 0 };
    for (const entry of entries) map[entry.status] += 1;
    return map;
  }, [entries]);

  async function setStatus(id: number, status: Status) {
    setSavingId(id);
    setError(null);
    try {
      await updateEntry(id, { status, completed_at: status === "Completed" ? new Date().toISOString().slice(0, 10) : undefined });
      await loadPage(offset, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salvestamine ebaõnnestus");
    } finally {
      setSavingId(null);
    }
  }

  function handleSort(field: SortField) {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{order === "asc" ? "↑" : "↓"}</span>;
  }

  if (loading) return <p className="empty-state">Laen…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", margin: "0 0 8px" }}>Admin</h2>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>
            Sama tabelitunnetus kui avalikus vaates, aga koos kiirete filtri- ja triage-võimalustega.
          </p>
        </div>
        <Link to="/admin/new" className="btn">
          + Lisa uus
        </Link>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            className={`btn ${statusFilter === status ? "" : "btn-secondary"}`}
            onClick={() => setStatusFilter(statusFilter === status ? undefined : status)}
          >
            {STATUS_LABEL[status]} {counts[status] ? `(${counts[status]})` : ""}
          </button>
        ))}
        {kindFilter ? (
          <button type="button" className="btn btn-secondary" onClick={() => setKindFilter(undefined)}>
            Kõik tüübid
          </button>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {KIND_ORDER.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`btn ${kindFilter === kind ? "" : "btn-secondary"}`}
            onClick={() => setKindFilter(kindFilter === kind ? undefined : kind)}
          >
            {KIND_LABEL[kind]}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}>
              <th onClick={() => handleSort("title")} style={{ padding: "12px 8px", cursor: "pointer" }}>
                Pealkiri <SortIcon field="title" />
              </th>
              <th onClick={() => handleSort("kind")} style={{ padding: "12px 8px", cursor: "pointer" }}>
                Tüüp <SortIcon field="kind" />
              </th>
              <th onClick={() => handleSort("author")} style={{ padding: "12px 8px", cursor: "pointer" }}>
                Autor <SortIcon field="author" />
              </th>
              <th onClick={() => handleSort("language")} style={{ padding: "12px 8px", cursor: "pointer" }}>
                Keel <SortIcon field="language" />
              </th>
              <th onClick={() => handleSort("status")} style={{ padding: "12px 8px", cursor: "pointer" }}>
                Staatus <SortIcon field="status" />
              </th>
              <th onClick={() => handleSort("completed_at")} style={{ padding: "12px 8px", cursor: "pointer" }}>
                Lõpetatud <SortIcon field="completed_at" />
              </th>
              <th style={{ padding: "12px 8px" }}>Hinnang</th>
              <th style={{ padding: "12px 8px", width: 160 }}>Tegevused</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "14px 8px" }}>
                  <Link to={`/admin/${entry.id}/edit`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 600 }}>
                    {entry.title}
                  </Link>
                  {entry.has_commentary && (
                    <span style={{ marginLeft: 8, color: "var(--ink-soft)", fontSize: 12 }}>kommentaar</span>
                  )}
                </td>
                <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>{KIND_LABEL[entry.kind]}</td>
                <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>{entry.author}</td>
                <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>
                  <span style={{ fontSize: 16 }}>{flagFor(entry.language)}</span>
                </td>
                <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>{STATUS_LABEL[entry.status]}</td>
                <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>
                  {entry.completed_at ? new Date(entry.completed_at).toLocaleDateString("et-EE") : "—"}
                </td>
                <td style={{ padding: "14px 8px", color: "var(--accent)", fontSize: 18 }}>{renderStars(entry.rating)}</td>
                <td style={{ padding: "14px 8px" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link
                      to={`/admin/${entry.id}/edit`}
                      className="btn btn-secondary"
                      style={{ fontSize: 13, padding: "6px 10px" }}
                    >
                      Muuda
                    </Link>
                    {entry.status !== "Tbr" && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 13, padding: "6px 10px" }}
                        disabled={savingId === entry.id}
                        onClick={() => void setStatus(entry.id, "Tbr")}
                      >
                        {savingId === entry.id ? "Salvestan…" : "TBR"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <button
            className="btn btn-secondary"
            disabled={loadingMore}
            onClick={() => void loadPage(offset + PAGE_SIZE, true)}
          >
            {loadingMore ? "Laen…" : "Laadi veel"}
          </button>
        </div>
      )}
    </div>
  );
}
