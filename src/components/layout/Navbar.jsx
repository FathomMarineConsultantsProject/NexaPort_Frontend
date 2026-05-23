import { Anchor, Briefcase, Grid2X2, MapPin, PlusCircle, Ship, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <header className="np-navbar">
      <div className="np-brand">
        <div className="np-logo">
          <Anchor size={24} />
        </div>
        <div className="np-brand-text">
          Nexa<span>Port</span>
        </div>
      </div>

      <nav className="np-navlinks">
        <NavLink to="/requests"><Briefcase size={18} /> Requests</NavLink>
        <NavLink to="/experts"><Users size={18} /> Experts</NavLink>
        <NavLink to="/fleet"><Ship size={18} /> Fleet</NavLink>
        <NavLink to="/ports"><MapPin size={18} /> Ports</NavLink>
        <NavLink to="/dashboard"><Grid2X2 size={18} /> Dashboard</NavLink>
      </nav>

      <button className="np-new-btn">
        <PlusCircle size={18} />
        New Request
      </button>
    </header>
  );
}