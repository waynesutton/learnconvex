import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App";
import { Stats } from "./components/Stats";
import { AdminLogin } from "./components/AdminLogin";
import { AdminRoute } from "./components/AdminRoute";
import { Playground } from "./components/Playground";
import { NotFound } from "./components/NotFound";

export function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Main learning app */}
        <Route path="/" element={<App />} />

        {/* Stats page */}
        <Route path="/stats" element={<Stats />} />

        {/* Admin login page */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Protected admin playground */}
        <Route
          path="/playground"
          element={
            <AdminRoute>
              <Playground />
            </AdminRoute>
          }
        />

        {/* 404 page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
