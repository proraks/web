import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listEntries } from "../api";
import type { EntryListItem, Kind } from "../api";
import { flagFor } from "../languages";

const PAGE_SIZE = 20;

export default function EntryListPage({ kind }: { kind?: Kind }) {
  const [searchParams] = useSearchParams();
  const [entries, setEntries] = useState<EntryListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const query = searchParams.get("q")?.trim() || "";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setEntries([]);
    setOffset(0);
    setHasMore(false);

    listEntries({ kind, q: query || undefined, limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        if (controller.signal.aborted) return;
        setEntries(data.items);
        setHasMore(data.has_more);
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, query]);

  if (error) return <p className="error-text">{error}</p>;
  if (loading) return <p className="empty-state">Laen…</p>;

  // Public view: entries are only clickable (navigable) when they have
  // commentary, regardless of the tab. The title itself is the link.
  const showJournal = kind === "Article";
  // Media and Articles have an external URL we surface directly in the table.
  const showUrl = kind === "Media" || kind === "Article";
  const showRating = kind === "Book";
  const showKindChip = !kind;

  const KIND_LABEL: Record<Kind, string> = {
    Book: "Raamat",
    ShortText: "Lühitekst",
    Article: "Artikkel",
    Media: "Meedia",
  };

  const KIND_STYLE: Record<Kind, { bg: string; fg: string }> = {
    Book: { bg: "transparent", fg: "var(--ink-soft)" },
    ShortText: { bg: "transparent", fg: "var(--ink-soft)" },
    Article: { bg: "transparent", fg: "var(--ink-soft)" },
    Media: { bg: "transparent", fg: "var(--ink-soft)" },
  };

  function renderStars(rating: number | null) {
    if (!rating) {
      return (
        <span aria-label="Hinnang puudub" title="Hinnang puudub">
          <span style={{ color: "var(--ink-soft)", opacity: 0.55 }}>☆☆☆☆☆</span>
        </span>
      );
    }
    return (
      <span aria-label={`Hinnang ${rating} / 5`} title={`${rating} / 5`}>
        <span style={{ color: "var(--accent)" }}>{"★★★★★".slice(0, rating)}</span>
        <span style={{ color: "var(--ink-soft)", opacity: 0.45 }}>{"★★★★★".slice(rating)}</span>
      </span>
    );
  }

  return (
    <div>
      {query && (
        <p style={{ margin: "0 0 18px", color: "var(--ink-soft)" }}>
          Tulemused otsingule: <strong style={{ color: "var(--ink)" }}>{query}</strong>
        </p>
      )}
      {entries.length === 0 ? (
        <p className="empty-state">Otsingule vastavaid kirjeid ei leitud.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}>
            <th style={{ padding: "12px 8px" }}>Pealkiri</th>
            <th style={{ padding: "12px 8px" }}>Autor</th>
            <th style={{ padding: "12px 8px" }}>Keel</th>
            {showJournal && <th style={{ padding: "12px 8px" }}>Ajakiri</th>}
            <th style={{ padding: "12px 8px" }}>Lõpetatud</th>
            {showRating && <th style={{ padding: "12px 8px" }}>Hinnang</th>}
              {showUrl && <th style={{ padding: "12px 8px" }}>Link</th>}
            </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const url = kind === "Media" ? entry.media_url : entry.article_url;
            return (
            <tr key={entry.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "14px 8px" }}>
                {entry.has_commentary ? (
                  <Link
                    to={`/entry/${entry.id}`}
                    style={{
                      color: "var(--ink)",
                      textDecoration: "none",
                      fontWeight: 500,
                      background: "var(--accent-soft)",
                      padding: "2px 7px",
                      borderRadius: 999,
                    }}
                  >
                    {entry.title}
                  </Link>
                ) : (
                  <span
                    style={{
                      color: "var(--ink-soft)",
                      background: "rgba(107, 100, 89, 0.06)",
                      padding: "2px 7px",
                      borderRadius: 999,
                    }}
                  >
                    {entry.title}
                  </span>
                )}
                {showKindChip && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      marginLeft: 8,
                      padding: 0,
                      fontSize: 11,
                      letterSpacing: "0.03em",
                      textTransform: "none",
                      background: KIND_STYLE[entry.kind].bg,
                      color: KIND_STYLE[entry.kind].fg,
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {KIND_LABEL[entry.kind]}
                  </span>
                )}
              </td>
              <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>
                {entry.author}
                {!kind && entry.journal ? (
                  <span style={{ color: "var(--ink-soft)" }}> ({entry.journal})</span>
                ) : null}
              </td>
              <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>
                <span style={{ fontSize: 16 }}>{flagFor(entry.language)}</span>
              </td>
              {showJournal && (
                <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>
                  {entry.journal}
                </td>
              )}
              <td style={{ padding: "14px 8px", color: "var(--ink-soft)" }}>
                {entry.completed_at
                  ? new Date(entry.completed_at).toLocaleDateString("et-EE")
                  : "—"}
              </td>
              {showRating && (
                <td style={{ padding: "14px 8px", fontSize: 18, letterSpacing: 1, color: "var(--accent)" }}>
                  {renderStars(entry.rating)}
                </td>
              )}
              {showUrl && (
                <td style={{ padding: "14px 8px", width: 56, textAlign: "center" }}>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ava link uues vahekaardis"
                      title="Ava link uues vahekaardis"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                        textDecoration: "none",
                        fontSize: 15,
                        lineHeight: 1,
                      }}
                    >
                      ↗
                    </a>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <button
            className="btn btn-secondary"
            disabled={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              try {
                const next = offset + PAGE_SIZE;
                const data = await listEntries({ kind, q: query || undefined, limit: PAGE_SIZE, offset: next });
                setEntries((prev) => [...prev, ...data.items]);
                setOffset(next);
                setHasMore(data.has_more);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Laadimine ebaõnnestus");
              } finally {
                setLoadingMore(false);
              }
            }}
          >
            {loadingMore ? "Laen…" : "Laadi veel"}
          </button>
        </div>
      )}
    </div>
  );
}
