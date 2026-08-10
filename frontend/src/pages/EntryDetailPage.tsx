import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEntry } from "../api";
import type { EntryDetail } from "../api";
import { flagFor } from "../languages";
import { ratingLabelEt } from "../ratings";

export default function EntryDetailPage() {
  const { id } = useParams();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getEntry(Number(id))
      .then(setEntry)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error-text">{error}</p>;
  if (!entry) return <p className="empty-state">Laen…</p>;

  const metaLines = [
    entry.author,
    entry.language ? flagFor(entry.language) : null,
    entry.completed_at && `loetud: ${entry.completed_at}`,
  ].filter(Boolean);
  const rating = entry.kind === "Book" ? entry.rating : null;

  return (
    <>
      <Link to="/" className="back-link">
        ← tagasi
      </Link>
      <div className="entry-detail-header">
        <div>
          <h2 className="entry-detail-title">{entry.title}</h2>
          <div className="entry-detail-meta">
            {metaLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {rating && (
              <div
                aria-label={`Hinnang ${rating} / 5 — ${ratingLabelEt(rating)}`}
                title={`${rating} / 5`}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span style={{ fontSize: 18, letterSpacing: 1 }}>
                  <span style={{ color: "var(--accent)" }}>{"★".repeat(rating)}</span>
                  <span style={{ color: "var(--ink-soft)" }}>{"★".repeat(5 - rating)}</span>
                </span>
                <span style={{ color: "var(--ink-soft)", fontSize: "0.85em" }}>{ratingLabelEt(rating)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {entry.commentary?.body ? (
        <div className="commentary">
          {entry.commentary.body.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : (
        <p className="empty-state">Kommentaar puudub.</p>
      )}
    </>
  );
}
