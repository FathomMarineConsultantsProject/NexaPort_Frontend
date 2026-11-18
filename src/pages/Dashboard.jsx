import { Navigate } from "react-router-dom";
import { getRoleId } from "../utils/auth";
import AdminDashboard from "./AdminDashboard";
import ClientDashboard from "./ClientDashboard";
import ExpertDashboard from "./ExpertDashboard";
import ProviderDashboard from "./ProviderDashboard";
import "./Dashboard.css";
import { postRegistrationV2 } from "../utils/postRegistrationRollout.js";
import { Link } from "react-router-dom";

function BasicDashboard() {
  return <main className="dashboard-container"><header><h1>Explore NexaPort</h1><p>Your account is ready. Browse the maritime network, or complete a profile when you need access to professional services.</p></header><nav aria-label="Explore NexaPort" className="basic-dashboard-links"><Link to="/companies">Companies</Link><Link to="/professionals">Maritime professionals</Link><Link to="/ports">Ports</Link><Link to="/requests/new">Create inspection request</Link><Link to="/onboarding">Complete a profile</Link><Link to="/profile">Account settings</Link></nav></main>;
}

export default function Dashboard() {
  const roleId = getRoleId();
  if (roleId === 1) return <AdminDashboard />;
  if (roleId === 2) return <ExpertDashboard />;
  if (roleId === 3) return <ClientDashboard />;
  if (roleId === 4) return <ProviderDashboard />;
  if (roleId === 5) return <Navigate to="/procurement/requisitions" replace />;
  if (roleId === 6) return postRegistrationV2 ? <BasicDashboard /> : <Navigate to="/onboarding" replace />;
  return <Navigate to="/login" replace />;
}
