import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEntries } from "../api";
import type { EntryListItem, Kind } from "../api";

const KIND_LABEL: Record<Kind, string> = {
  long_text: "raamat",
  short_text: "lühitekst",
  video: "video",
};

export default function EntryListPage({ kind }: { kind?: Kind }) {
  const [entries, setEntries] = useState<EntryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(null);
    listEntries(kind)
      .then(setEntries)
      .catch((e) => setError(e.message));
  }, [kind]);

  if (error) return <p className="error-text">{error}</p>;
  if (!entries) return <p className="empty-state">Laen…</p>;
  if (entries.length === 0) return <p className="empty-state">Siin pole veel midagi.</p>;

  return (
    <ul className="entry-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link to={`/entry/${entry.id}`} className="entry-row">
            <div className="entry-row-top">
              <span className="entry-title">{entry.title}</span>
              {entry.year_published && <span className="entry-year">{entry.year_published}</span>}
            </div>
            <div className="entry-meta">
              {entry.author && <span>{entry.author}</span>}
              {!kind && <span className="entry-kind-tag">{KIND_LABEL[entry.kind]}</span>}
              {entry.has_commentary && <span className="commentary-mark">märkmed</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
