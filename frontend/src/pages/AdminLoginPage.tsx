import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api";
import { useAdmin } from "../AdminContext";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setIsAdmin } = useAdmin();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(password);
      setIsAdmin(true);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sisselogimine ebaõnnestus");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320 }}>
      <div className="field">
        <label htmlFor="password">Admin parool</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "…" : "Logi sisse"}
      </button>
    </form>
  );
}
