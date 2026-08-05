import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import ApprovedClientRoute from "./components/auth/ApprovedClientRoute";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import RegisterConsultant from "./pages/RegisterConsultant";
import RegisterClient from "./pages/RegisterClient";
import RegisterMaritimeCompany from "./pages/RegisterMaritimeCompany";
import CompanyProfile from "./pages/CompanyProfile";
import ClientVerificationStatus from "./pages/ClientVerificationStatus";
import AdminClientRegistrations from "./pages/AdminClientRegistrations";
import AdminClientRegistrationDetails from "./pages/AdminClientRegistrationDetails";
import AdminClientDetails from "./pages/AdminClientDetails";
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
import MaritimeDirectoryPage from "./pages/MaritimeDirectoryPage";
import MaritimeDirectoryDetails from "./pages/MaritimeDirectoryDetails";
import MaritimeDirectoryForm from "./components/directories/MaritimeDirectoryForm";
import { NEW_ADMIN_DIRECTORIES } from "./config/adminDirectories";
import PostServiceRequest from "./pages/PostServiceRequest";
import ServiceRequestDetails from "./pages/ServiceRequestDetails";
import ServiceRequests from "./pages/ServiceRequests";
import Dashboard from "./pages/Dashboard";
import TemplatesPage from "./pages/TemplatesPage";
import TemplateEditorPage from "./pages/TemplateEditorPage";
import FillReportPage from "./pages/FillReportPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import { getRoleId, getStoredUser, isMaritimeCompany } from "./utils/auth";
import "./App.css";

function RequireAuth({ children }) {
  if (!localStorage.getItem("np_token")) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }) {
  if (!localStorage.getItem("np_token")) return children;
  const user = getStoredUser();
  const destination = user.account_type === "maritime_company" || Number(user.role_id) === 4 ? "/company-profile" : Number(user.role_id) === 3 && user.verification_status !== "approved" ? "/client-verification-status" : "/dashboard";
  return <Navigate to={destination} replace />;
}

function CompanyBoundary({ children }) {
  const location = useLocation();
  return isMaritimeCompany() && location.pathname !== "/company-profile" ? <Navigate to="/company-profile" replace /> : children;
}

function AdminOnly({ children }) {
  return getRoleId() === 1 ? children : <Navigate to="/requests" replace state={{ notice: "You do not have access to that page." }} />;
}

function HideFromClient({ children }) {
  return getRoleId() === 3 ? <Navigate to="/requests" replace state={{ notice: "Clients cannot access the Experts page." }} /> : children;
}

function TemplatesOnly({ children }) {
  return [1, 2].includes(getRoleId()) ? children : <Navigate to="/requests" replace state={{ notice: "Clients cannot access Templates." }} />;
}

function TemplateAuthorOnly({ children }) {
  return [1, 2].includes(getRoleId()) ? children : <Navigate to="/templates" replace state={{ notice: "You cannot create templates or reports." }} />;
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
        <Route path="/templates" element={<TemplatesOnly><TemplatesPage /></TemplatesOnly>} />
        <Route path="/templates/new" element={<TemplateAuthorOnly><TemplateEditorPage /></TemplateAuthorOnly>} />
        <Route path="/templates/:id/fill" element={<TemplateAuthorOnly><FillReportPage /></TemplateAuthorOnly>} />
        <Route path="/templates/:id" element={<TemplatesOnly><TemplateEditorPage /></TemplatesOnly>} />
        <Route path="/reports/:id" element={<TemplatesOnly><ReportDetailPage /></TemplatesOnly>} />
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
        {NEW_ADMIN_DIRECTORIES.map((directory) => (
          <Route key={directory.path} path={directory.path} element={<AdminOnly><MaritimeDirectoryPage directory={directory} /></AdminOnly>} />
        ))}
        <Route path="/directories/:directoryType/new" element={<AdminOnly><MaritimeDirectoryForm /></AdminOnly>} />
        <Route path="/directories/:directoryType/:entityId/edit" element={<AdminOnly><MaritimeDirectoryForm /></AdminOnly>} />
        <Route path="/directories/:directoryType/:entityId" element={<AdminOnly><MaritimeDirectoryDetails /></AdminOnly>} />
        <Route path="/admin/client-registrations" element={<AdminOnly><AdminClientRegistrations /></AdminOnly>} />
      <Route
          path="/admin/client-registrations/register"
          element={
            <AdminOnly>
              <RegisterClient adminMode />
            </AdminOnly>
          }
        />
        <Route path="/admin/client-registrations/:clientProfileId" element={<AdminOnly><AdminClientRegistrationDetails /></AdminOnly>} />
        <Route path="/admin/clients/:userId" element={<AdminOnly><AdminClientDetails /></AdminOnly>} />
        <Route path="/ports" element={<PortDirectory />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
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
      <Route path="/register-maritime-company" element={<GuestOnly><RegisterMaritimeCompany /></GuestOnly>} />
      <Route path="/login" element={<GuestOnly><Auth /></GuestOnly>} />
      <Route path="/client-verification-status" element={<RequireAuth><ClientVerificationStatus /></RequireAuth>} />
      <Route path="/*" element={<RequireAuth><ApprovedClientRoute><CompanyBoundary><Shell /></CompanyBoundary></ApprovedClientRoute></RequireAuth>} />
    </Routes>
  );
}
