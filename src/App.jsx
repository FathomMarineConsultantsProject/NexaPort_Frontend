import { Navigate, Route, Routes } from "react-router-dom";

import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";

import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import UserProfile from "./pages/Userprofile";

import ExpertDirectory from "./pages/ExpertDirectory";
import ExpertProfile from "./pages/ExpertProfile";
import RegisterExpert from "./pages/RegisterExpert";

import FleetManagement from "./pages/FleetManagement";
import PortDirectory from "./pages/PortDirectory";

import PostServiceRequest from "./pages/PostServiceRequest";
import ServiceRequestDetails from "./pages/ServiceRequestDetails";
import ServiceRequests from "./pages/ServiceRequests";

import Dashboard from "./pages/Dashboard";

import { getRoleId } from "./utils/auth";

import "./App.css";

function RequireAuth({ children }) {
  const token = localStorage.getItem("np_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }) {
  const token = localStorage.getItem("np_token");
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function AdminOnly({ children }) {
  if (getRoleId() !== 1) {
    return (
      <Navigate
        to="/requests"
        replace
        state={{ notice: "You do not have access to that page." }}
      />
    );
  }

  return children;
}

function HideFromClient({ children }) {
  if (getRoleId() === 3) {
    return (
      <Navigate
        to="/requests"
        replace
        state={{ notice: "Clients cannot access the Experts page." }}
      />
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        path="/login"
        element={
          <GuestOnly>
            <Auth />
          </GuestOnly>
        }
      />

      <Route
        path="/*"
        element={
          <RequireAuth>
            <div className="app-shell">
              <Navbar />

              <main className="app-main">
                <Routes>
                  <Route path="/app" element={<Navigate to="/dashboard" replace />} />

                  <Route path="/dashboard" element={<Dashboard />} />

                  <Route path="/requests" element={<ServiceRequests />} />
                  <Route path="/requests/new" element={<PostServiceRequest />} />
                  <Route path="/requests/:id" element={<ServiceRequestDetails />} />

                  <Route
                    path="/experts"
                    element={
                      <HideFromClient>
                        <ExpertDirectory />
                      </HideFromClient>
                    }
                  />

                  <Route
                    path="/experts/register"
                    element={
                      <AdminOnly>
                        <RegisterExpert />
                      </AdminOnly>
                    }
                  />

                  <Route
                    path="/experts/:id"
                    element={
                      <HideFromClient>
                        <ExpertProfile />
                      </HideFromClient>
                    }
                  />

                  <Route path="/fleet" element={<FleetManagement />} />
                  <Route path="/ports" element={<PortDirectory />} />
                  <Route path="/profile" element={<UserProfile />} />

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
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