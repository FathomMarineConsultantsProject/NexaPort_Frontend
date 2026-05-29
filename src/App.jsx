import { Navigate, Route, Routes } from "react-router-dom";

import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";

import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import UserProfile from "./pages/UserProfile";

import ExpertDirectory from "./pages/ExpertDirectory";
import ExpertProfile from "./pages/ExpertProfile";
import RegisterExpert from "./pages/RegisterExpert";

import FleetManagement from "./pages/FleetManagement";
import PortDirectory from "./pages/PortDirectory";

import PostServiceRequest from "./pages/PostServiceRequest";
import ServiceRequestDetails from "./pages/ServiceRequestDetails";
import ServiceRequests from "./pages/ServiceRequests";

import Dashboard from "./pages/Dashboard";

import "./App.css";

// Bounce unauthenticated users to /login
function RequireAuth({ children }) {
  const token = localStorage.getItem("np_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Bounce already-logged-in users away from public-only pages
function GuestOnly({ children }) {
  const token = localStorage.getItem("np_token");
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ── Public pages (no Navbar/Footer) ── */}

      {/* Landing — root always shows landing */}
      <Route path="/" element={<Landing />} />

      {/* Login/Register — only if NOT logged in */}
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Auth />
          </GuestOnly>
        }
      />

      {/* ── All authenticated pages (Navbar + Footer) ── */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <div className="app-shell">
              <Navbar />
              <main className="app-main">
                <Routes>
                  {/* Default logged-in entry point */}
                  <Route path="/app" element={<Navigate to="/requests" />} />

                  {/* Service Requests */}
                  <Route path="/requests" element={<ServiceRequests />} />
                  <Route path="/requests/new" element={<PostServiceRequest />} />
                  <Route path="/requests/:id" element={<ServiceRequestDetails />} />

                  {/* Experts */}
                  <Route path="/experts" element={<ExpertDirectory />} />
                  <Route path="/experts/register" element={<RegisterExpert />} />
                  <Route path="/experts/:id" element={<ExpertProfile />} />

                  {/* Fleet */}
                  <Route path="/fleet" element={<FleetManagement />} />

                  {/* Ports */}
                  <Route path="/ports" element={<PortDirectory />} />

                  {/* Dashboard */}
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* User Profile */}
                  <Route path="/profile" element={<UserProfile />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/requests" />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </RequireAuth>
        }
      />
    </Routes>
  );
}