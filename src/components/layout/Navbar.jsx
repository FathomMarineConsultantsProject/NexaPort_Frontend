import {
  Anchor,
  Briefcase,
  Grid2X2,
  LogOut,
  MapPin,
  Ship,
  User,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getRoleId } from "../../utils/auth";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const storedUser = localStorage.getItem("np_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const initial = user?.full_name?.trim()?.[0]?.toUpperCase() || "U";

  const roleId = getRoleId();
  const isClient = roleId === 3;

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("np_token");
    localStorage.removeItem("np_user");
    navigate("/");
  };

  return (
    <header className="np-navbar">
      <div className="np-brand" onClick={() => navigate("/")} role="button">
        <div className="np-logo">
          <Anchor size={22} />
        </div>
        <div className="np-brand-text">
          Nexa<span>Port</span>
        </div>
      </div>

      <nav className="np-navlinks">
        <NavLink to="/requests">
          <Briefcase size={17} /> Requests
        </NavLink>

        {!isClient && (
          <NavLink to="/experts">
            <Users size={17} /> Experts
          </NavLink>
        )}

        <NavLink to="/fleet">
          <Ship size={17} /> Fleet
        </NavLink>

        <NavLink to="/ports">
          <MapPin size={17} /> Ports
        </NavLink>

        <NavLink to="/dashboard">
          <Grid2X2 size={17} /> Dashboard
        </NavLink>
      </nav>

      <div className="np-profile-wrap" ref={menuRef}>
        <button
          className="np-avatar-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          title={user?.full_name || "Account"}
        >
          <span className="np-avatar-initial">{initial}</span>
          <span className="np-avatar-name">
            {user?.full_name?.split(" ")[0] || "Account"}
          </span>
        </button>

        {menuOpen && (
          <div className="np-profile-menu">
            <div className="np-profile-menu-head">
              <div className="np-profile-menu-avatar">{initial}</div>
              <div>
                <div className="np-profile-menu-name">{user?.full_name || "User"}</div>
                <div className="np-profile-menu-email">{user?.email || ""}</div>
              </div>
            </div>

            <div className="np-profile-menu-divider" />

            <button
              className="np-profile-menu-item"
              onClick={() => {
                navigate("/profile");
                setMenuOpen(false);
              }}
            >
              <User size={15} />
              View Profile
            </button>

            <div className="np-profile-menu-divider" />

            <button className="np-profile-menu-item danger" onClick={handleLogout}>
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}