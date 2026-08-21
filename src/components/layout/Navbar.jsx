import {
  Anchor,
  Bell,
  Building2,
  Briefcase,
  ChevronDown,
  ClipboardList,
  Grid2X2,
  LockKeyhole,
  LogOut,
  MapPin,
  Route as RouteIcon,
  Menu,
  Ship,
  User,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { matchPath, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../api/adminNotificationApi";
import { getRoleId, isMaritimeCompany } from "../../utils/auth";
import { ADMIN_DIRECTORIES, ADMIN_DIRECTORY_GROUPS } from "../../config/adminDirectories";
import ConsultantAvatar from "../experts/ConsultantAvatar";
import {
  CONSULTANT_PHOTO_UPDATED_EVENT,
  clearConsultantPhotoCache,
  getCurrentConsultant,
} from "../../utils/consultantPhotoCache";
import "./Navbar.css";
import ResetPasswordModal from "../auth/ResetPasswordModal";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [directoriesOpen, setDirectoriesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDirectoriesOpen, setMobileDirectoriesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const menuRef = useRef(null);
  const directoriesRef = useRef(null);
  const directoriesTriggerRef = useRef(null);
  const mobileTriggerRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationRequestInFlight = useRef(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const storedUser = localStorage.getItem("np_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [photoUrl, setPhotoUrl] = useState(null);
  const [expertId, setExpertId] = useState(null);

  const roleId = getRoleId();
  const isClient = roleId === 3;
  const isSuperAdmin = roleId === 1;
  const isCompany = isMaritimeCompany();
  const canUseNotifications = roleId === 1 || roleId === 2;
  const userId = user?.id;
  const directoryActive = location.pathname.startsWith("/directories/") || ADMIN_DIRECTORIES.some(({ path }) =>
    matchPath({ path: `${path}/*` }, location.pathname)
  );

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
      if (directoriesRef.current && !directoriesRef.current.contains(event.target)) {
        setDirectoriesOpen(false);
      }
    };
    if (directoriesOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [directoriesOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      if (directoriesOpen) directoriesTriggerRef.current?.focus();
      if (mobileOpen) mobileTriggerRef.current?.focus();
      setDirectoriesOpen(false);
      setMobileOpen(false);
    };
    if (directoriesOpen || mobileOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [directoriesOpen, mobileOpen]);

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

  const handlePasswordChanged = () => {
    clearConsultantPhotoCache(userId);
    localStorage.removeItem("np_token");
    localStorage.removeItem("np_user");
    setResetPasswordOpen(false);
    navigate("/login");
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

  const closeMobileNavigation = () => {
    setMobileOpen(false);
    setMobileDirectoriesOpen(false);
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
        {isCompany ? <NavLink to="/company-profile"><Building2 size={17} /> Company Profile</NavLink> : <>
        <NavLink to="/requests">
          <Briefcase size={17} /> Requests
        </NavLink>

        {!isClient && (
          <NavLink to="/experts">
            <Users size={17} /> Consultants
          </NavLink>
        )}

        {!isClient && (
          <NavLink to="/templates">
            <ClipboardList size={17} /> Templates
          </NavLink>
        )}

        {isSuperAdmin && (
          <>
            <NavLink to="/admin/inspection-workflows">
              <RouteIcon size={17} /> Inspection Workflow
            </NavLink>
            <NavLink to="/admin/client-registrations">
              <Users size={17} /> Owners &amp; Managers
            </NavLink>

            <div className="np-directories" ref={directoriesRef}>
              <button
                ref={directoriesTriggerRef}
                type="button"
                className={`np-directories-trigger${directoryActive ? " active" : ""}`}
                aria-expanded={directoriesOpen}
                aria-controls="directories-popover"
                onClick={() => {
                  setDirectoriesOpen((open) => !open);
                  setNotificationsOpen(false);
                  setMenuOpen(false);
                }}
              >
                Directories <ChevronDown size={15} aria-hidden="true" />
              </button>

              {directoriesOpen && (
                <div id="directories-popover" className="np-directories-popover" aria-label="Directories">
                  {ADMIN_DIRECTORY_GROUPS.map((group) => (
                    <section key={group.label}>
                      <span>{group.label}</span>
                      {group.items.map(({ label, path, icon: Icon }) => (
                        <NavLink key={path} to={path} onClick={() => setDirectoriesOpen(false)}>
                          <Icon size={16} aria-hidden="true" /> {label}
                        </NavLink>
                      ))}
                    </section>
                  ))}
                </div>
              )}
            </div>
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
        </>}
      </nav>

      <button
        ref={mobileTriggerRef}
        type="button"
        className="np-mobile-toggle"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
        aria-controls="mobile-navigation"
        onClick={() => {
          setMobileOpen((open) => !open);
          setDirectoriesOpen(false);
          setNotificationsOpen(false);
          setMenuOpen(false);
        }}
      >
        {mobileOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

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
                closeMobileNavigation();
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
              closeMobileNavigation();
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


              <button
                type="button"
                className="np-profile-menu-item"
                onClick={() => {
                  setResetPasswordOpen(true);
                  setMenuOpen(false);
                }}
              >
                <LockKeyhole size={15} />
                Reset Password
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

      {mobileOpen && (
        <nav id="mobile-navigation" className="np-mobile-nav" aria-label="Mobile navigation">
          {isCompany ? <><NavLink to="/dashboard" onClick={closeMobileNavigation}><Grid2X2 size={18} /> Dashboard</NavLink><NavLink to="/company-profile" onClick={closeMobileNavigation}><Building2 size={18} /> Company Profile</NavLink></> : <>
          <NavLink to="/requests" onClick={closeMobileNavigation}>
            <Briefcase size={18} /> Requests
          </NavLink>

          {!isClient && (
            <NavLink to="/experts" onClick={closeMobileNavigation}>
              <Users size={18} /> Consultants
            </NavLink>
          )}

          {!isClient && (
            <NavLink to="/templates" onClick={closeMobileNavigation}>
              <ClipboardList size={18} /> Templates
            </NavLink>
          )}

          {isSuperAdmin && (
            <>
              <NavLink to="/admin/inspection-workflows" onClick={closeMobileNavigation}>
                <RouteIcon size={18} /> Inspection Workflow
              </NavLink>
              <NavLink to="/admin/client-registrations" onClick={closeMobileNavigation}>
                <Users size={18} /> Owners &amp; Managers
              </NavLink>

              <div className="np-mobile-directories">
                <button
                  type="button"
                  className={directoryActive ? "active" : ""}
                  aria-expanded={mobileDirectoriesOpen}
                  aria-controls="mobile-directory-links"
                  onClick={() => setMobileDirectoriesOpen((open) => !open)}
                >
                  <span>Directories</span>
                  <ChevronDown className={mobileDirectoriesOpen ? "expanded" : ""} size={17} aria-hidden="true" />
                </button>

                {mobileDirectoriesOpen && (
                  <div id="mobile-directory-links" className="np-mobile-directory-links">
                    {ADMIN_DIRECTORY_GROUPS.map((group) => (
                      <section key={group.label}>
                        <span>{group.label}</span>
                        {group.items.map(({ label, path, icon: Icon }) => (
                          <NavLink key={path} to={path} onClick={closeMobileNavigation}>
                            <Icon size={17} aria-hidden="true" /> {label}
                          </NavLink>
                        ))}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <NavLink to="/fleet" onClick={closeMobileNavigation}>
            <Ship size={18} /> Fleet
          </NavLink>
          <NavLink to="/ports" onClick={closeMobileNavigation}>
            <MapPin size={18} /> Ports
          </NavLink>
          <NavLink to="/dashboard" onClick={closeMobileNavigation}>
            <Grid2X2 size={18} /> Dashboard
          </NavLink>
          </>}
        </nav>
      )}

      <ResetPasswordModal
        open={resetPasswordOpen}
        defaultEmail={user?.email || ""}
        onClose={() => setResetPasswordOpen(false)}
        onPasswordChanged={handlePasswordChanged}
      />
    </header>
  );
}
