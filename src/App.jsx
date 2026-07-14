import { Navigate, Route, Routes } from "react-router-dom";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import ApprovedClientRoute from "./components/auth/ApprovedClientRoute";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import RegisterConsultant from "./pages/RegisterConsultant";
import RegisterClient from "./pages/RegisterClient";
import ClientVerificationStatus from "./pages/ClientVerificationStatus";
import AdminClientRegistrations from "./pages/AdminClientRegistrations";
import AdminClientRegistrationDetails from "./pages/AdminClientRegistrationDetails";
import UserProfile from "./pages/Userprofile";
import ExpertDirectory from "./pages/ExpertDirectory";
import ExpertProfile from "./pages/ExpertProfile";
import RegisterExpert from "./pages/RegisterExpert";
import FleetManagement from "./pages/FleetManagement";
import PortDirectory from "./pages/PortDirectory";
import FlagDirectory from "./pages/FlagDirectory";
import FlagInspectorProfile from "./pages/FlagInspectorProfile";
import AccreditedInspectorDirectory from "./pages/AccreditedInspectorDirectory";
import AppointedSurveyorDirectory from "./pages/AppointedSurveyorDirectory";
import PostServiceRequest from "./pages/PostServiceRequest";
import ServiceRequestDetails from "./pages/ServiceRequestDetails";
import ServiceRequests from "./pages/ServiceRequests";
import Dashboard from "./pages/Dashboard";
import { getRoleId, getStoredUser } from "./utils/auth";
import "./App.css";

function RequireAuth({ children }) {
  if (!localStorage.getItem("np_token")) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }) {
  if (!localStorage.getItem("np_token")) return children;
  const user = getStoredUser();
  const destination = Number(user.role_id) === 3 && user.verification_status !== "approved" ? "/client-verification-status" : "/dashboard";
  return <Navigate to={destination} replace />;
}

function AdminOnly({ children }) {
  return getRoleId() === 1 ? children : <Navigate to="/requests" replace state={{ notice: "You do not have access to that page." }} />;
}

function HideFromClient({ children }) {
  return getRoleId() === 3 ? <Navigate to="/requests" replace state={{ notice: "Clients cannot access the Experts page." }} /> : children;
}

function RequestCreatorOnly({ children }) {
  return [1, 3].includes(getRoleId())
    ? children
    : <Navigate to="/requests" replace state={{ notice: "Experts cannot create service requests." }} />;
}

const Shell = () => (
  <div className="app-shell">
    <Navbar />
    <main className="app-main">
      <Routes>
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/requests" element={<ServiceRequests />} />
        <Route path="/requests/new" element={<RequestCreatorOnly><PostServiceRequest /></RequestCreatorOnly>} />
        <Route path="/requests/:id" element={<ServiceRequestDetails />} />
        <Route path="/experts" element={<HideFromClient><ExpertDirectory /></HideFromClient>} />
        <Route path="/experts/register" element={<AdminOnly><RegisterExpert /></AdminOnly>} />
        <Route path="/experts/:id" element={<HideFromClient><ExpertProfile /></HideFromClient>} />
        <Route path="/fleet" element={<FleetManagement />} />
        <Route path="/flag" element={<AdminOnly><FlagDirectory /></AdminOnly>} />
        <Route path="/flag/:flagSlug" element={<AdminOnly><FlagDirectory /></AdminOnly>} />
        <Route path="/flag/:flagSlug/inspectors/:inspectorId" element={<AdminOnly><FlagInspectorProfile /></AdminOnly>} />
        <Route path="/accredited-inspectors" element={<AdminOnly><AccreditedInspectorDirectory /></AdminOnly>} />
        <Route path="/accredited-inspectors/:schemeSlug" element={<AdminOnly><AccreditedInspectorDirectory /></AdminOnly>} />
        <Route path="/appointed-surveyors" element={<AdminOnly><AppointedSurveyorDirectory /></AdminOnly>} />
        <Route path="/admin/client-registrations" element={<AdminOnly><AdminClientRegistrations /></AdminOnly>} />
        <Route path="/admin/client-registrations/:clientProfileId" element={<AdminOnly><AdminClientRegistrationDetails /></AdminOnly>} />
        <Route path="/ports" element={<PortDirectory />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </main>
    <Footer />
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register-consultant" element={<RegisterConsultant />} />
      <Route path="/register-client" element={<GuestOnly><RegisterClient /></GuestOnly>} />
      <Route path="/login" element={<GuestOnly><Auth /></GuestOnly>} />
      <Route path="/client-verification-status" element={<RequireAuth><ClientVerificationStatus /></RequireAuth>} />
      <Route path="/*" element={<RequireAuth><ApprovedClientRoute><Shell /></ApprovedClientRoute></RequireAuth>} />
    </Routes>
  );
}
