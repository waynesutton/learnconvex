import { Routes, Route } from "react-router-dom";
import App from "./App";
import { Stats } from "./components/Stats";

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/stats" element={<Stats />} />
    </Routes>
  );
}

export default AppRouter;
