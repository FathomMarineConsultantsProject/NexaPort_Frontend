import { Link, useSearchParams } from "react-router-dom";
import FleetManagement from "./FleetManagement";
import VesselDirectory from "./VesselDirectory";
import { getRoleId } from "../utils/auth";
import "./Vessels.css";

export default function Vessels() {
  const [params] = useSearchParams();
  const role = getRoleId();
  const admin = role === 1;
  if (!admin && role !== 3) return <main className="vessels-unavailable">Vessels are unavailable for this account.</main>;
  const fleet = !admin || params.get("view") === "fleet";
  return <div className="vessels-workspace">
    <nav className="vessels-contexts" aria-label="Vessel collections">
      {admin && <Link to="/vessels?view=directory" className={!fleet ? "active" : ""} aria-current={!fleet ? "page" : undefined}>Vessel Directory</Link>}
      <Link to="/vessels?view=fleet" className={fleet ? "active" : ""} aria-current={fleet ? "page" : undefined}>{admin ? "Managed Vessels" : "My Fleet"}</Link>
    </nav>
    {fleet ? <FleetManagement /> : <VesselDirectory />}
  </div>;
}
