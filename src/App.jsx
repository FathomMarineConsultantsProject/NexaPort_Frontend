import { Route, Routes, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ExpertDirectory from "./pages/ExpertDirectory";
import RegisterExpert from "./pages/RegisterExpert";
import ExpertProfile from "./pages/ExpertProfile";
import "./App.css";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/experts" />} />
          <Route path="/experts" element={<ExpertDirectory />} />
          <Route path="/experts/:id" element={<ExpertProfile />} />
          <Route path="/experts/register" element={<RegisterExpert />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}