import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "./api";
import { useAdmin } from "./AdminContext";

export default function Layout() {
  const { isAdmin, setIsAdmin } = useAdmin();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout().catch(() => {});
    setIsAdmin(false);
    navigate("/");
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
            <Link to="/">loetud</Link>
          </h1>
          <nav>
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
                <NavLink to="/videos" className={({ isActive }) => (isActive ? "active" : "")}>
                  Videod
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
