import {
  Anchor,
  BadgeCheck,
  Bell,
  Briefcase,
  ClipboardCheck,
  Flag,
  Grid2X2,
  LogOut,
  MapPin,
  Ship,
  User,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../api/adminNotificationApi";
import { getRoleId } from "../../utils/auth";
import ConsultantAvatar from "../experts/ConsultantAvatar";
import {
  CONSULTANT_PHOTO_UPDATED_EVENT,
  clearConsultantPhotoCache,
  getCurrentConsultant,
} from "../../utils/consultantPhotoCache";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const menuRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationRequestInFlight = useRef(false);

  const storedUser = localStorage.getItem("np_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [photoUrl, setPhotoUrl] = useState(null);
  const [expertId, setExpertId] = useState(null);

  const roleId = getRoleId();
  const isClient = roleId === 3;
  const isSuperAdmin = roleId === 1;
  const canUseNotifications = roleId === 1 || roleId === 2;
  const userId = user?.id;

  const loadNotifications = useCallback(async () => {
    if (!canUseNotifications || notificationRequestInFlight.current) return;
    notificationRequestInFlight.current = true;
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const response = await getAdminNotifications();
      setNotifications(response.data || []);
      setUnreadCount(Number(response.unread_count) || 0);
    } catch (error) {
      setNotificationsError(
        error.response?.data?.message || "Unable to load notifications."
      );
    } finally {
      notificationRequestInFlight.current = false;
      setNotificationsLoading(false);
    }
  }, [canUseNotifications]);

  useEffect(() => {
    if (!canUseNotifications) return undefined;
    const initialLoadId = window.setTimeout(loadNotifications, 0);
    const handleFocus = () => loadNotifications();
    window.addEventListener("focus", handleFocus);
    const intervalId = window.setInterval(loadNotifications, 50000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(intervalId);
    };
  }, [canUseNotifications, loadNotifications]);

  useEffect(() => {
    let active = true;

    if (roleId !== 2) {
      return undefined;
    }

    getCurrentConsultant({ id: userId, role_id: roleId })
      .then((consultant) => {
        if (active) {
          setPhotoUrl(consultant.photoUrl);
          setExpertId(consultant.expertId);
        }
      })
      .catch(() => {
        if (active) {
          setPhotoUrl(null);
          setExpertId(null);
        }
      });

    return () => {
      active = false;
    };
  }, [roleId, userId]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notificationsOpen]);

  useEffect(() => {
    const handlePhotoUpdated = (event) => {
      if (Number(event.detail?.userId) !== Number(userId)) return;

      setPhotoUrl(event.detail?.photoUrl || null);
      if (event.detail?.expertId) {
        setExpertId(event.detail.expertId);
      }
    };

    window.addEventListener(
      CONSULTANT_PHOTO_UPDATED_EVENT,
      handlePhotoUpdated
    );
    return () =>
      window.removeEventListener(
        CONSULTANT_PHOTO_UPDATED_EVENT,
        handlePhotoUpdated
      );
  }, [userId]);

  const handleLogout = () => {
    clearConsultantPhotoCache(userId);
    localStorage.removeItem("np_token");
    localStorage.removeItem("np_user");
    navigate("/");
  };

  const openNotification = async (notification) => {
    const wasUnread = !notification.read_at;
    if (wasUnread) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      markAdminNotificationRead(notification.id).catch(loadNotifications);
    }

    const payload = notification.payload || {};
    const destination =
      notification.type === "service_request_approved"
        ? `/requests/${payload.request_id || notification.entity_id}`
        : notification.type === "client_registration"
        ? `/admin/client-registrations/${payload.registration_id || notification.entity_id}`
        : `/experts/${payload.expert_id || notification.entity_id}`;
    setNotificationsOpen(false);
    navigate(destination);
  };

  const markAllRead = async () => {
    if (!unreadCount) return;
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at || readAt }))
    );
    setUnreadCount(0);
    try {
      await markAllAdminNotificationsRead();
    } catch {
      loadNotifications();
    }
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
            <Users size={17} /> Consultants
          </NavLink>
        )}

        {canUseNotifications && (
          <>
            <NavLink to="/admin/client-registrations">
              <Users size={17} /> Client Registrations
            </NavLink>

            <NavLink to="/flag">
              <Flag size={17} /> Flag
            </NavLink>

            <NavLink to="/accredited-inspectors">
              <BadgeCheck size={17} /> Accredited
            </NavLink>

            <NavLink to="/appointed-surveyors">
              <ClipboardCheck size={17} /> Appointed
            </NavLink>
          </>
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

      <div className="np-account-actions">
        {isSuperAdmin && (
          <div className="np-notifications-wrap" ref={notificationsRef}>
            <button
              type="button"
              className="np-notification-button"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setMenuOpen(false);
                if (!notificationsOpen) loadNotifications();
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="np-notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="np-notification-menu">
                <div className="np-notification-menu-head">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllRead}>Mark all as read</button>
                  )}
                </div>
                <div className="np-notification-list">
                  {notificationsLoading && !notifications.length ? (
                    <div className="np-notification-state">Loading notifications...</div>
                  ) : notificationsError ? (
                    <div className="np-notification-state error">
                      <span>{notificationsError}</span>
                      <button type="button" onClick={loadNotifications}>Retry</button>
                    </div>
                  ) : !notifications.length ? (
                    <div className="np-notification-state">No notifications</div>
                  ) : (
                    notifications.map((notification) => {
                      const payload = notification.payload || {};
                      return (
                        <button
                          type="button"
                          key={notification.id}
                          className={`np-notification-item ${notification.read_at ? "read" : "unread"}`}
                          onClick={() => openNotification(notification)}
                        >
                          <span className="np-notification-type">{notification.type === "service_request_approved" ? "Inspection request" : notification.type === "client_registration" ? "Client registration" : "Consultant registration"}</span>
                          <strong>{notification.type === "service_request_approved" ? notification.title : payload.name || notification.title}</strong>
                          {notification.type === "service_request_approved" ? <span>{notification.message}</span> : <>{payload.company && <span>{payload.company}</span>}{payload.email && <small>{payload.email}</small>}</>}
                          <time>{new Date(notification.created_at).toLocaleString()}</time>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      <div className="np-profile-wrap" ref={menuRef}>
        <button
          className="np-avatar-btn"
          onClick={() => {
            setMenuOpen(!menuOpen);
            setNotificationsOpen(false);
          }}
          title={user?.full_name || "Account"}
        >
          <ConsultantAvatar
            className="np-avatar-initial"
            photoUrl={photoUrl}
            name={user?.full_name}
            fallback="U"
          />
          <span className="np-avatar-name">
            {user?.full_name?.split(" ")[0] || "Account"}
          </span>
        </button>

        {menuOpen && (
          <div className="np-profile-menu">
            <div className="np-profile-menu-head">
              <ConsultantAvatar
                className="np-profile-menu-avatar"
                photoUrl={photoUrl}
                name={user?.full_name}
                fallback="U"
              />
              <div>
                <div className="np-profile-menu-name">{user?.full_name || "User"}</div>
                <div className="np-profile-menu-email">{user?.email || ""}</div>
              </div>
            </div>

            <div className="np-profile-menu-divider" />

            <button
              className="np-profile-menu-item"
              onClick={() => {
                const destination =
                  roleId === 2 && expertId
                    ? `/experts/${expertId}`
                    : "/profile";
                navigate(destination);
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
      </div>
    </header>
  );
}
