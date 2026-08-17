import { Navigate } from "react-router-dom";
import { getRoleId } from "../utils/auth";
import AdminDashboard from "./AdminDashboard";
import ClientDashboard from "./ClientDashboard";
import ExpertDashboard from "./ExpertDashboard";
import ProviderDashboard from "./ProviderDashboard";
import "./Dashboard.css";

export default function Dashboard() {
  const roleId = getRoleId();
  if (roleId === 1) return <AdminDashboard />;
  if (roleId === 2) return <ExpertDashboard />;
  if (roleId === 3) return <ClientDashboard />;
  if (roleId === 4) return <ProviderDashboard />;
  return <Navigate to="/login" replace />;
}
