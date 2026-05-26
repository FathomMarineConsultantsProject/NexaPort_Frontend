import { Route, Routes, Navigate } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

import ExpertDirectory from "./pages/ExpertDirectory";
import RegisterExpert from "./pages/RegisterExpert";
import ExpertProfile from "./pages/ExpertProfile";
import FleetManagement from "./pages/FleetManagement";
import PortDirectory from "./pages/PortDirectory";

import ServiceRequests from "./pages/ServiceRequests";
import PostServiceRequest from "./pages/PostServiceRequest";
import ServiceRequestDetails from "./pages/ServiceRequestDetails";

import "./App.css";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/requests" />} />

          <Route path="/requests" element={<ServiceRequests />} />
          <Route path="/requests/new" element={<PostServiceRequest />} />
          <Route path="/requests/:id" element={<ServiceRequestDetails />} />

          <Route path="/experts" element={<ExpertDirectory />} />
          <Route path="/experts/register" element={<RegisterExpert />} />
          <Route path="/experts/:id" element={<ExpertProfile />} />

          <Route path="/fleet" element={<FleetManagement />} />
          <Route path="/ports" element={<PortDirectory />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}