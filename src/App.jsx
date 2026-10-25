import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import ApprovedClientRoute from "./components/auth/ApprovedClientRoute";
import useValidatedSession from "./components/auth/useValidatedSession";
import Auth from "./pages/Auth";
import ChooseWorkspace from "./pages/ChooseWorkspace";
import Landing from "./pages/Landing";
import RegisterConsultant from "./pages/RegisterConsultant";
import RegisterClient from "./pages/RegisterClient";
import RegisterMaritimeCompany from "./pages/RegisterMaritimeCompany";
import CompanyProfile from "./pages/CompanyProfile";
import CompanyClaim, { CompanySearch, MyCompanyClaims } from "./pages/CompanyClaim";
import AdminCompanyClaims from "./pages/AdminCompanyClaims";
import ProfessionalClaim, { ProfessionalSearch, RegisterProfessionalClaim, MyProfessionalClaims, ManagedProfessionalProfile } from "./pages/ProfessionalClaim";
import AdminProfessionalClaims from "./pages/AdminProfessionalClaims";
import AdminProfileClaims from "./pages/AdminProfileClaims";
import ClaimInvitation from "./pages/ClaimInvitation";
import ClientVerificationStatus from "./pages/ClientVerificationStatus";
import AdminClientRegistrations from "./pages/AdminClientRegistrations";
import AdminClientRegistrationDetails from "./pages/AdminClientRegistrationDetails";
import AdminClientDetails from "./pages/AdminClientDetails";
import UserProfile from "./pages/Userprofile";
import ExpertDirectory from "./pages/ExpertDirectory";
import ExpertProfile from "./pages/ExpertProfile";
import RegisterExpert from "./pages/RegisterExpert";
import Vessels from "./pages/Vessels";
import VesselDirectoryDetail from "./pages/VesselDirectoryDetail";
import PortDirectory from "./pages/PortDirectory";
import PortDetailPage from "./pages/PortDetailPage";
import FlagDirectory from "./pages/FlagDirectory";
import FlagInspectorProfile from "./pages/FlagInspectorProfile";
import AccreditedInspectorDirectory from "./pages/AccreditedInspectorDirectory";
import AppointedSurveyorDirectory from "./pages/AppointedSurveyorDirectory";
import InspectorSearch from "./pages/InspectorSearch";
import MaritimeDirectoryPage from "./pages/MaritimeDirectoryPage";
import MaritimeDirectoryDetails from "./pages/MaritimeDirectoryDetails";
import SupplierPublicProfile from "./pages/SupplierPublicProfile";
import ProductSearch from "./components/directories/ProductSearch";
import MaritimeDirectoryForm from "./components/directories/MaritimeDirectoryForm";
import { NEW_ADMIN_DIRECTORIES } from "./config/adminDirectories";
import PostServiceRequest from "./pages/PostServiceRequest";
import ServiceRequestDetails from "./pages/ServiceRequestDetails";
import SharedRequest from "./pages/SharedRequest";
import { loginPathFor, safeReturnPath } from "./utils/safeReturnPath";
import ServiceRequests from "./pages/ServiceRequests";
import Dashboard from "./pages/Dashboard";
import TemplatesPage from "./pages/TemplatesPage";
import TemplateEditorPage from "./pages/TemplateEditorPage";
import FillReportPage from "./pages/FillReportPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import InspectionWorkflowQueue from "./pages/InspectionWorkflowQueue";
import InspectionWorkflowWorkspace from "./pages/InspectionWorkflowWorkspace";
import { getRoleId, isMaritimeCompany } from "./utils/auth";
import { workspaceDestination } from "./utils/workspaceRoles.js";
import "./App.css";

function RequireAuth({ children }) {
  if (!localStorage.getItem("np_token")) return <Navigate to={loginPathFor(window.location.pathname)} replace />;
  return children;
}

function GuestOnly({ children }) {
  const session = useValidatedSession();
  if (session.status === "checking") return <div className="route-loading" role="status">Checking your session...</div>;
  if (session.status === "indeterminate") return <div className="route-loading" role="alert">Unable to check your session. <button type="button" onClick={session.retry}>Try again</button> <button type="button" onClick={session.signOut}>Sign in again</button></div>;
  if (session.status === "unauthenticated") return children;
  const user = session.user;
  const requested = safeReturnPath(new URLSearchParams(window.location.search).get("returnTo"));
  const workspace = workspaceDestination(user);
  const destination = requested?.startsWith("/companies/") || requested?.startsWith("/professionals/") || requested?.startsWith("/claim-invitations/") ? requested : workspace === "/client-verification-status" ? workspace : requested || workspace;
  return <Navigate to={destination} replace />;
}

function CompanyBoundary({ children }) {
  const location = useLocation();
  if (isMaritimeCompany() && !["/company-profile", "/dashboard", "/profile"].some((p) => location.pathname.startsWith(p))) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AdminOnly({ children }) {
  return getRoleId() === 1 ? children : <Navigate to="/requests" replace state={{ notice: "You do not have access to that page." }} />;
}

function LegacyVesselsRedirect({ view }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("view", view);
  return <Navigate to={`/vessels?${params}`} replace />;
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
        <Route path="/admin/inspection-workflows" element={<AdminOnly><InspectionWorkflowQueue /></AdminOnly>} />
        <Route path="/admin/inspection-workflow/:requestId" element={<AdminOnly><InspectionWorkflowWorkspace /></AdminOnly>} />
        <Route path="/experts" element={<HideFromClient><ExpertDirectory /></HideFromClient>} />
        <Route path="/experts/register" element={<AdminOnly><RegisterExpert /></AdminOnly>} />
        <Route path="/experts/:id" element={<HideFromClient><ExpertProfile /></HideFromClient>} />
        <Route path="/vessels" element={<Vessels />} />
        <Route path="/fleet" element={<LegacyVesselsRedirect view="fleet" />} />
        <Route path="/vessel-directory" element={<AdminOnly><LegacyVesselsRedirect view="directory" /></AdminOnly>} />
        <Route path="/vessel-directory/:id" element={<AdminOnly><VesselDirectoryDetail /></AdminOnly>} />
        <Route path="/flag" element={<AdminOnly><FlagDirectory /></AdminOnly>} />
        <Route path="/flag/:flagSlug" element={<AdminOnly><FlagDirectory /></AdminOnly>} />
        <Route path="/flag/:flagSlug/inspectors/:inspectorId" element={<AdminOnly><FlagInspectorProfile /></AdminOnly>} />
        <Route path="/accredited-inspectors" element={<AdminOnly><AccreditedInspectorDirectory /></AdminOnly>} />
        <Route path="/accredited-inspectors/:schemeSlug" element={<AdminOnly><AccreditedInspectorDirectory /></AdminOnly>} />
        <Route path="/appointed-surveyors" element={<AdminOnly><AppointedSurveyorDirectory /></AdminOnly>} />
        <Route path="/inspector-search" element={<AdminOnly><InspectorSearch /></AdminOnly>} />
        <Route path="/surveyors" element={<AdminOnly><InspectorSearch humanOnly /></AdminOnly>} />
        {NEW_ADMIN_DIRECTORIES.map((directory) => (
          <Route key={directory.path} path={directory.path} element={directory.type === "supplier" && getRoleId() === 3
            ? <main className="md-page md-page--supplier"><h1>Suppliers</h1><h2>Products</h2><ProductSearch /></main>
            : <AdminOnly><MaritimeDirectoryPage directory={directory} /></AdminOnly>} />
        ))}
        <Route path="/supplier-profiles/:id" element={<SupplierPublicProfile />} />
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
        <Route path="/ports/:id" element={<PortDetailPage />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
        <Route path="/company-profile/:entityId" element={<CompanyProfile />} />
        <Route path="/admin/company-claims" element={<AdminOnly><Navigate to="/admin/profile-claims?type=companies" replace /></AdminOnly>} />
        <Route path="/admin/profile-claims" element={<AdminOnly><AdminProfileClaims /></AdminOnly>} />
        <Route path="/admin/company-claims/:id" element={<AdminOnly><AdminCompanyClaims /></AdminOnly>} />
        <Route path="/admin/professional-claims" element={<AdminOnly><Navigate to="/admin/profile-claims?type=professionals" replace /></AdminOnly>} />
        <Route path="/admin/professional-claims/:id" element={<AdminOnly><AdminProfessionalClaims /></AdminOnly>} />
        <Route path="/professional-profile/:type/:id" element={<ManagedProfessionalProfile />} />
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
      <Route path="/register-professional-claim" element={<GuestOnly><RegisterProfessionalClaim /></GuestOnly>} />
      <Route path="/companies" element={<CompanySearch />} />
      <Route path="/companies/:id/claim" element={<CompanyClaim />} />
      <Route path="/company-claims" element={<RequireAuth><MyCompanyClaims /></RequireAuth>} />
      <Route path="/professionals" element={<ProfessionalSearch />} />
      <Route path="/professionals/:type/:id/claim" element={<ProfessionalClaim />} />
      <Route path="/professional-claims" element={<RequireAuth><MyProfessionalClaims /></RequireAuth>} />
      <Route path="/claim-invitations/:token" element={<ClaimInvitation />} />
      <Route path="/login" element={<GuestOnly><Auth /></GuestOnly>} />
      <Route path="/s/:opaqueIdentifier" element={<SharedRequest />} />
      <Route path="/choose-workspace" element={<RequireAuth><ChooseWorkspace /></RequireAuth>} />
      <Route path="/client-verification-status" element={<RequireAuth><ClientVerificationStatus /></RequireAuth>} />
      <Route path="/*" element={<RequireAuth><ApprovedClientRoute><CompanyBoundary><Shell /></CompanyBoundary></ApprovedClientRoute></RequireAuth>} />
    </Routes>
  );
}
