import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import EntryListPage from "./pages/EntryListPage";
import EntryDetailPage from "./pages/EntryDetailPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminEntryFormPage from "./pages/AdminEntryFormPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<EntryListPage />} />
        <Route path="/books" element={<EntryListPage kind="long_text" />} />
        <Route path="/texts" element={<EntryListPage kind="short_text" />} />
        <Route path="/videos" element={<EntryListPage kind="video" />} />
        <Route path="/entry/:id" element={<EntryDetailPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/new" element={<AdminEntryFormPage />} />
        <Route path="/admin/:id/edit" element={<AdminEntryFormPage />} />
      </Route>
    </Routes>
  );
}
