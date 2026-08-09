import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminListEntries } from "../api";
import type { Entry, Status } from "../api";
import { useAdmin } from "../AdminContext";

const STATUS_LABEL: Record<Status, string> = {
  ToRead: "Tahan lugeda",
  Reading: "Loen praegu",
  Read: "Loetud",
};

export default function AdminDashboardPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const { setIsAdmin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    adminListEntries()
      .then((data) => {
        setIsAdmin(true); // token accepted - also handles the post-refresh re-sync
        setEntries(data);
      })
      .catch(() => {
        setIsAdmin(false);
        navigate("/admin/login");
      });
  }, []);

  if (!entries) return <p className="empty-state">Laen…</p>;

  const grouped: Record<Status, Entry[]> = { ToRead: [], Reading: [], Read: [] };
  for (const e of entries) grouped[e.status].push(e);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", margin: 0 }}>Kõik kirjed</h2>
        <Link to="/admin/new" className="btn">
          + Lisa uus
        </Link>
      </div>

      {(Object.keys(STATUS_LABEL) as Status[]).map((status) => (
        <div key={status} style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 14, textTransform: "uppercase", color: "var(--ink-soft)" }}>
            {STATUS_LABEL[status]} ({grouped[status].length})
          </h3>
          {grouped[status].length === 0 ? (
            <p className="empty-state">—</p>
          ) : (
            <ul className="entry-list">
              {grouped[status].map((entry) => (
                <li key={entry.id}>
                  <Link to={`/admin/${entry.id}/edit`} className="entry-row">
                    <div className="entry-row-top">
                      <span className="entry-title">{entry.title}</span>
                      {entry.year_published && <span className="entry-year">{entry.year_published}</span>}
                    </div>
                    <div className="entry-meta">
                      {entry.author && <span>{entry.author}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  );
}
