import { Route, Routes, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import ExpertDirectory from "./pages/ExpertDirectory";
import RegisterExpert from "./pages/RegisterExpert";
import ExpertProfile from "./pages/ExpertProfile";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/experts" />} />
        <Route path="/experts" element={<ExpertDirectory />} />
        <Route path="/experts/:id" element={<ExpertProfile />} />
        <Route path="/experts/register" element={<RegisterExpert />} />
      </Routes>
    </>
  );
}