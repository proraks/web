import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface AdminContextValue {
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  // Restore the admin bar on reload if a (possibly still valid) token exists.
  // Admin pages additionally re-check the token against the API on load and
  // flip this back off if it expired - see AdminDashboardPage.
  const [isAdmin, setIsAdmin] = useState<boolean>(() =>
    Boolean(sessionStorage.getItem("auth_token")),
  );
  return <AdminContext.Provider value={{ isAdmin, setIsAdmin }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
