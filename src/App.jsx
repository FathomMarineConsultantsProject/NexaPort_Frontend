import { Navigate, Route, Routes } from "react-router-dom";

import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";

import Auth from "./pages/Auth";

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

// Redirects to /login if no token in localStorage
function RequireAuth({ children }) {
  const token = localStorage.getItem("np_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Redirects already-logged-in users away from /login
function GuestOnly({ children }) {
  const token = localStorage.getItem("np_token");
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Auth page — no Navbar / Footer */}
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Auth />
          </GuestOnly>
        }
      />

      {/* All protected pages — wrapped in Navbar + Footer */}
      <Route
        path="/*"
        element={
          <RequireAuth>
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

                  <Route path="/dashboard" element={<Dashboard />} />

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