import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "./api";
import { useAdmin } from "./AdminContext";

export default function Layout() {
  const { isAdmin, setIsAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");

  async function handleLogout() {
    await logout().catch(() => {});
    setIsAdmin(false);
    navigate("/");
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("q") ?? "");
  }, [location.search]);

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = search.trim();
    navigate(query ? `${location.pathname}?q=${encodeURIComponent(query)}` : location.pathname);
  }

  return (
    <>
      {isAdmin && (
        <div className="admin-bar">
          <div className="container">
            <span>Admin</span>
            <div style={{ display: "flex", gap: 16 }}>
              <Link to="/admin">Dashboard</Link>
              <Link to="/admin/new">Add entry</Link>
              <button onClick={handleLogout}>Log out</button>
            </div>
          </div>
        </div>
      )}
      <header className="site-header">
        <div className="container">
          <h1 className="site-title">
            <Link to="/">Minu remargid. - Ralf J. Kask</Link>
          </h1>
          <nav className="header-nav">
            <ul className="tabs">
              <li>
                <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
                  Kõik
                </NavLink>
              </li>
              <li>
                <NavLink to="/books" className={({ isActive }) => (isActive ? "active" : "")}>
                  Raamatud
                </NavLink>
              </li>
              <li>
                <NavLink to="/texts" className={({ isActive }) => (isActive ? "active" : "")}>
                  Lühitekstid
                </NavLink>
              </li>
              <li>
                <NavLink to="/articles" className={({ isActive }) => (isActive ? "active" : "")}>
                  Artiklid
                </NavLink>
              </li>
              <li>
                <NavLink to="/media" className={({ isActive }) => (isActive ? "active" : "")}>
                  Meedia
                </NavLink>
              </li>
            </ul>
            <form className="header-search" onSubmit={handleSearchSubmit}>
              <label className="header-search-label">
                <span aria-hidden="true" className="header-search-icon" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Otsi..."
                  aria-label="Otsi kirjeid"
                  className="header-search-input"
                />
              </label>
            </form>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
