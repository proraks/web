import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminGetEntry, createEntry, updateEntry, upsertCommentary } from "../api";
import type { Kind, Status } from "../api";

const emptyForm = {
  kind: "LongText" as Kind,
  title: "",
  author: "",
  language: "",
  year_written: "",
  year_published: "",
  image_url: "",
  status: "ToRead" as Status,
  read_at: "",
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
          year_written: data.year_written?.toString() ?? "",
          year_published: data.year_published?.toString() ?? "",
          image_url: data.image_url ?? "",
          status: data.status,
          read_at: data.read_at ?? "",
          commentary_title: data.commentary?.title ?? "",
          commentary_body: data.commentary?.body ?? "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        kind: form.kind,
        title: form.title,
        author: form.author || undefined,
        language: form.language || undefined,
        year_written: form.year_written ? Number(form.year_written) : undefined,
        year_published: form.year_published ? Number(form.year_published) : undefined,
        image_url: form.image_url || undefined,
        status: form.status,
      };

      let entryId: number;
      if (isEdit) {
        entryId = Number(id);
        await updateEntry(entryId, { ...payload, read_at: form.read_at || undefined });
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
            <option value="LongText">Pikk tekst</option>
            <option value="ShortText">Lühitekst</option>
            <option value="Video">Video</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Staatus</label>
          <select id="status" value={form.status} onChange={(e) => update("status", e.target.value as Status)}>
            <option value="ToRead">Tahan lugeda</option>
            <option value="Reading">Loen praegu</option>
            <option value="Read">Loetud</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="title">Pealkiri</label>
        <input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} required />
      </div>

      <div className="field">
        <label htmlFor="author">Autor</label>
        <input id="author" value={form.author} onChange={(e) => update("author", e.target.value)} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="language">Keel (nt et, en, ru)</label>
          <input id="language" value={form.language} onChange={(e) => update("language", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="year_written">Kirjutamisaasta</label>
          <input
            id="year_written"
            type="number"
            value={form.year_written}
            onChange={(e) => update("year_written", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="year_published">Ilmumisaasta</label>
          <input
            id="year_published"
            type="number"
            value={form.year_published}
            onChange={(e) => update("year_published", e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="image_url">Pildi URL (kaas vms)</label>
        <input id="image_url" value={form.image_url} onChange={(e) => update("image_url", e.target.value)} />
      </div>

      {isEdit && (
        <div className="field">
          <label htmlFor="read_at">Loetud kuupäev</label>
          <input
            id="read_at"
            type="date"
            value={form.read_at}
            onChange={(e) => update("read_at", e.target.value)}
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
