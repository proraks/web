import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminGetEntry, createEntry, updateEntry, upsertCommentary } from "../api";
import type { Kind, Status } from "../api";
import { LANGUAGES } from "../languages";
import { RATING_LABELS_ET } from "../ratings";

const emptyForm = {
  kind: "Book" as Kind,
  title: "",
  author: "",
  language: "et",
  status: "Tbr" as Status,
  completed_at: "",
  // Book
  isbn: "",
  pages: "",
  publisher: "",
  rating: "",
  // ShortText
  doi: "",
  short_text_url: "",
  // Article
  journal: "",
  issue: "",
  article_url: "",
  // Media
  media_subtype: "Video",
  media_url: "",
  commentary_title: "",
  commentary_body: "",
};

export default function AdminEntryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    adminGetEntry(Number(id))
      .then((data) => {
        setForm({
          kind: data.kind,
          title: data.title,
          author: data.author ?? "",
          language: data.language ?? "",
          status: data.status,
          completed_at: data.completed_at ? data.completed_at.slice(0, 10) : "",
          // Book
          isbn: data.isbn ?? "",
          pages: data.pages?.toString() ?? "",
          publisher: data.publisher ?? "",
          rating: data.rating?.toString() ?? "",
          // ShortText
          doi: data.doi ?? "",
          short_text_url: data.short_text_url ?? "",
          // Article
          journal: data.journal ?? "",
          issue: data.issue ?? "",
          article_url: data.article_url ?? "",
          // Media
          media_subtype: data.media_subtype ?? "",
          media_url: data.media_url ?? "",
          commentary_title: data.commentary?.title ?? "",
          commentary_body: data.commentary?.body ?? "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // When status becomes "lõpetatud" (Completed) and no completion date has
      // been chosen yet, pre-fill today's date.
      if (key === "status" && value === "Completed" && !next.completed_at) {
        next.completed_at = new Date().toISOString().slice(0, 10);
      }
      if (key === "status" && value !== "Completed") {
        next.rating = "";
      }
      if (key === "kind" && value !== "Book") {
        next.rating = "";
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validation: mandatory fields
    if (!form.title.trim()) {
      setError("Pealkiri on kohustuslik");
      setSaving(false);
      return;
    }
    if (!form.language.trim()) {
      setError("Keel on kohustuslik");
      setSaving(false);
      return;
    }
    if (!form.author.trim()) {
      setError("Autor on kohustuslik");
      setSaving(false);
      return;
    }
    if (form.status === "Completed" && !form.completed_at) {
      setError("Lõpetamise kuupäev on kohustuslik, kui staatus on 'lõpetatud'");
      setSaving(false);
      return;
    }
    if (form.kind === "Book" && form.status === "Completed") {
      const rating = Number(form.rating);
      if (!form.rating || Number.isNaN(rating) || rating < 1 || rating > 5) {
        setError("Raamatu hinnang on kohustuslik, kui staatus on 'lõpetatud' (1-5)");
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        kind: form.kind,
        title: form.title,
        author: form.author || undefined,
        language: form.language || undefined,
        status: form.status,
        // Book
        isbn: form.isbn || undefined,
        pages: form.pages ? Number(form.pages) : undefined,
        publisher: form.publisher || undefined,
        rating: form.kind === "Book" ? (form.rating ? Number(form.rating) : undefined) : undefined,
        // ShortText
        doi: form.doi || undefined,
        short_text_url: form.short_text_url || undefined,
        // Article
        journal: form.journal || undefined,
        issue: form.issue || undefined,
        article_url: form.article_url || undefined,
        // Media
        media_subtype: (form.media_subtype === "Video" || form.media_subtype === "Audio"
          ? form.media_subtype
          : undefined) as "Video" | "Audio" | undefined,
        media_url: form.media_url || undefined,
      };

      let entryId: number;
      if (isEdit) {
        entryId = Number(id);
        await updateEntry(entryId, { ...payload, completed_at: form.completed_at || undefined });
      } else {
        const res = await createEntry(payload);
        entryId = res.id;
      }

      if (form.commentary_body.trim()) {
        await upsertCommentary(entryId, form.commentary_title, form.commentary_body, true);
      }

      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvestamine ebaõnnestus");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="empty-state">Laen…</p>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
      <h2 style={{ fontFamily: "var(--font-display)" }}>{isEdit ? "Muuda kirjet" : "Uus kirje"}</h2>

      <div className="field-row">
        <div className="field">
          <label htmlFor="kind">Tüüp</label>
          <select id="kind" value={form.kind} onChange={(e) => update("kind", e.target.value as Kind)}>
            <option value="Book">Raamat</option>
            <option value="ShortText">Lühitekst</option>
            <option value="Article">Artikkel</option>
            <option value="Media">Meedia</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Staatus</label>
          <select id="status" value={form.status} onChange={(e) => update("status", e.target.value as Status)}>
            <option value="Tbr">ootel</option>
            <option value="InProgress">pooleli</option>
            <option value="Completed">lõpetatud</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="title">Pealkiri</label>
        <input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} required />
      </div>

      <div className="field">
        <label htmlFor="author">Autor</label>
        <input id="author" value={form.author} onChange={(e) => update("author", e.target.value)} required />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="language">Keel</label>
          <select id="language" value={form.language} onChange={(e) => update("language", e.target.value)} required>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.label} ({l.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.kind === "Book" && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="isbn">ISBN</label>
            <input id="isbn" value={form.isbn} onChange={(e) => update("isbn", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pages">Lehekülgi</label>
            <input
              id="pages"
              type="number"
              value={form.pages}
              onChange={(e) => update("pages", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="publisher">Kirjastus</label>
            <input id="publisher" value={form.publisher} onChange={(e) => update("publisher", e.target.value)} />
          </div>
        </div>
      )}

      {form.kind === "Book" && form.status === "Completed" && (
        <div className="field" style={{ maxWidth: 180 }}>
          <label htmlFor="rating">Hinnang</label>
          <select id="rating" value={form.rating} onChange={(e) => update("rating", e.target.value)} required>
                        <option value="" disabled>
              Vali
            </option>
            <option value="1">1 — {RATING_LABELS_ET[1]}</option>
            <option value="2">2 — {RATING_LABELS_ET[2]}</option>
            <option value="3">3 — {RATING_LABELS_ET[3]}</option>
            <option value="4">4 — {RATING_LABELS_ET[4]}</option>
            <option value="5">5 — {RATING_LABELS_ET[5]}</option>
          </select>
        </div>
      )}

      {form.kind === "ShortText" && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="doi">DOI</label>
            <input id="doi" value={form.doi} onChange={(e) => update("doi", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="short_text_url">URL</label>
            <input id="short_text_url" value={form.short_text_url} onChange={(e) => update("short_text_url", e.target.value)} />
          </div>
        </div>
      )}

      {form.kind === "Article" && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="journal">Ajakiri</label>
            <input id="journal" value={form.journal} onChange={(e) => update("journal", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="issue">Number</label>
            <input id="issue" value={form.issue} onChange={(e) => update("issue", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="article_url">URL</label>
            <input id="article_url" value={form.article_url} onChange={(e) => update("article_url", e.target.value)} />
          </div>
        </div>
      )}

      {form.kind === "Media" && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="media_subtype">Tüüp</label>
            <select id="media_subtype" value={form.media_subtype} onChange={(e) => update("media_subtype", e.target.value)}>
              <option value="Video">Video</option>
              <option value="Audio">Audio</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="media_url">URL</label>
            <input id="media_url" value={form.media_url} onChange={(e) => update("media_url", e.target.value)} />
          </div>
        </div>
      )}

      {form.status === "Completed" && (
        <div className="field">
          <label htmlFor="completed_at">Lõpetamise kuupäev</label>
          <input
            id="completed_at"
            type="date"
            value={form.completed_at}
            onChange={(e) => update("completed_at", e.target.value)}
            required
          />
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "24px 0" }} />

      <div className="field">
        <label htmlFor="commentary_title">Kommentaari pealkiri (valikuline)</label>
        <input
          id="commentary_title"
          value={form.commentary_title}
          onChange={(e) => update("commentary_title", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="commentary_body">
          Kommentaar — esimene lõik kuvatakse rasvases kirjas, eralda lõigud tühja reaga
        </label>
        <textarea
          id="commentary_body"
          value={form.commentary_body}
          onChange={(e) => update("commentary_body", e.target.value)}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Salvestan…" : "Salvesta"}
      </button>
    </form>
  );
}
