import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface AdminContextValue {
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  // Note: this resets to false on every page reload since the session cookie is
  // httpOnly (deliberately unreadable from JS). Admin pages re-check against the
  // API on load and flip this back to true if the cookie's still valid - see
  // AdminDashboardPage. That's fine at this project's scale; a page refresh just
  // means a brief "checking..." flash before the admin bar reappears.
  const [isAdmin, setIsAdmin] = useState(false);
  return <AdminContext.Provider value={{ isAdmin, setIsAdmin }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
