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
  Route as RouteIcon,
  Menu,
  User,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, matchPath, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../api/adminNotificationApi";
import { getRoleId, isMaritimeCompany } from "../../utils/auth";
import { getNavigationDirectoryGroups } from "../../config/adminDirectories";
import ConsultantAvatar from "../experts/ConsultantAvatar";
import {
  CONSULTANT_PHOTO_UPDATED_EVENT,
  clearConsultantPhotoCache,
  getCurrentConsultant,
} from "../../utils/consultantPhotoCache";
import "./Navbar.css";
import ResetPasswordModal from "../auth/ResetPasswordModal";
import { hasMultipleRoles, WORKSPACE_LABELS } from "../../utils/workspaceRoles.js";

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
  const profileTriggerRef = useRef(null);
  const notificationTriggerRef = useRef(null);
  const notificationsRef = useRef(null);
  const notificationRequestInFlight = useRef(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const storedUser = localStorage.getItem("np_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [photoUrl, setPhotoUrl] = useState(null);
  const [expertId, setExpertId] = useState(null);

  const roleId = getRoleId();
  const isSuperAdmin = roleId === 1;
  const isCompany = isMaritimeCompany();
  const canUseNotifications = roleId === 1 || roleId === 2;
  const userId = user?.id;
  const visibleDirectoryGroups = getNavigationDirectoryGroups(roleId);
  const avatarPhoto = photoUrl || user?.photo_url || user?.profile_photo_url || user?.avatar_url || null;
  const directoryActive = location.pathname.startsWith("/directories/") || visibleDirectoryGroups.flatMap((group) => group.items).some(({ path }) =>
    matchPath({ path: `${path.split("?")[0]}/*` }, location.pathname)
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
      if (menuOpen) profileTriggerRef.current?.focus();
      if (notificationsOpen) notificationTriggerRef.current?.focus();
      setDirectoriesOpen(false);
      setMobileOpen(false);
      setMenuOpen(false);
      setNotificationsOpen(false);
    };
    if (directoriesOpen || mobileOpen || menuOpen || notificationsOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [directoriesOpen, mobileOpen, menuOpen, notificationsOpen]);

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
      (notification.type?.startsWith("quotation_") || notification.type?.startsWith("commercial_proposal_"))
        ? (roleId === 1 ? `/admin/inspection-workflow/${payload.request_id}` : `/requests/${payload.request_id}`)
        :
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

  const handleDirectoryKeys = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const links = [...directoriesRef.current?.querySelectorAll(".np-directories-popover a") || []];
    if (!directoriesOpen) {
      event.preventDefault();
      setDirectoriesOpen(true);
      window.requestAnimationFrame(() => directoriesRef.current?.querySelector(".np-directories-popover a")?.focus());
      return;
    }
    if (!links.length) return;
    event.preventDefault();
    const current = links.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1
      : event.key === "ArrowDown" ? (current + 1) % links.length : (current - 1 + links.length) % links.length;
    links[next].focus();
  };

  return (
    <header className="np-navbar">
      <Link className="np-brand" to="/" aria-label="NexaPort home">
        <div className="np-logo">
          <Anchor size={22} />
        </div>
        <div className="np-brand-text">
          Nexa<span>Port</span>
        </div>
      </Link>

      <nav className="np-navlinks" aria-label="Primary navigation">
        {isCompany ? <><NavLink to="/dashboard"><Grid2X2 size={17} aria-hidden="true" /> Dashboard</NavLink><NavLink to="/company-profile"><Building2 size={17} aria-hidden="true" /> Company Profile</NavLink></> : <>
        <NavLink to="/dashboard">
          <Grid2X2 size={17} /> Dashboard
        </NavLink>
        <NavLink to="/requests">
          <Briefcase size={17} /> Requests
        </NavLink>

        {isSuperAdmin && <NavLink to="/admin/inspection-workflows">
          <RouteIcon size={17} /> Inspection Workflow
        </NavLink>}
          {visibleDirectoryGroups.length > 0 && (
            <div className="np-directories" ref={directoriesRef}>
              <button
                ref={directoriesTriggerRef}
                type="button"
                className={`np-directories-trigger${directoryActive ? " active" : ""}`}
                aria-expanded={directoriesOpen}
                aria-controls="directories-popover"
                onKeyDown={handleDirectoryKeys}
                onClick={() => {
                  setDirectoriesOpen((open) => !open);
                  setNotificationsOpen(false);
                  setMenuOpen(false);
                }}
              >
                Directories <ChevronDown size={15} aria-hidden="true" />
              </button>

              {directoriesOpen && (
                <div id="directories-popover" className={`np-directories-popover np-directories-popover--${visibleDirectoryGroups.length}`} aria-label="Directories" onKeyDown={handleDirectoryKeys}>
                  {visibleDirectoryGroups.map((group) => (
                    <section key={group.label}>
                      <h2>{group.label}</h2>
                      {group.items.map(({ label, path, icon: Icon, description }) => (
                        <NavLink key={path} to={path} onClick={() => setDirectoriesOpen(false)}>
                          <Icon size={18} aria-hidden="true" /><span><strong>{label}</strong>{description && <small>{description}</small>}</span>
                        </NavLink>
                      ))}
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

        {(isSuperAdmin || roleId === 2) && (
          <NavLink to="/templates">
            <ClipboardList size={17} /> Templates
          </NavLink>
        )}

        {isSuperAdmin && <NavLink to="/admin/client-registrations">
          <Users size={17} /> Client approvals
        </NavLink>}
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
        {canUseNotifications && (
          <div className="np-notifications-wrap" ref={notificationsRef}>
            <button
              ref={notificationTriggerRef}
              type="button"
              className="np-notification-button"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              aria-expanded={notificationsOpen}
              aria-controls="notifications-menu"
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setMenuOpen(false);
                closeMobileNavigation();
                if (!notificationsOpen) loadNotifications();
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="np-notification-badge" aria-hidden="true" />}
            </button>

            {notificationsOpen && (
              <div id="notifications-menu" className="np-notification-menu">
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
                          <span className="np-notification-type">{notification.type?.startsWith("quotation_") ? "Quotation" : notification.type?.startsWith("commercial_proposal_") ? "Commercial proposal" : notification.type === "service_request_approved" ? "Inspection request" : notification.type === "client_registration" ? "Client registration" : "Consultant registration"}</span>
                          <strong>{notification.type === "service_request_approved" || notification.type?.startsWith("quotation_") || notification.type?.startsWith("commercial_proposal_") ? notification.title : payload.name || notification.title}</strong>
                          {notification.type === "service_request_approved" || notification.type?.startsWith("quotation_") || notification.type?.startsWith("commercial_proposal_") ? <span>{notification.message}</span> : <>{payload.company && <span>{payload.company}</span>}{payload.email && <small>{payload.email}</small>}</>}
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
            ref={profileTriggerRef}
            type="button"
            className="np-avatar-btn"
            aria-label={`Account menu for ${user?.full_name || "user"}`}
            aria-expanded={menuOpen}
            aria-controls="profile-menu"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setNotificationsOpen(false);
              closeMobileNavigation();
            }}
            title={user?.full_name || "Account"}
          >
            <ConsultantAvatar
              className="np-avatar-initial"
              photoUrl={avatarPhoto}
              name={user?.full_name}
              fallback="U"
            />
          </button>

          {menuOpen && (
            <div id="profile-menu" className="np-profile-menu">
              <div className="np-profile-menu-head">
                <ConsultantAvatar
                  className="np-profile-menu-avatar"
                  photoUrl={avatarPhoto}
                  name={user?.full_name}
                  fallback="U"
                />
                <div>
                  <div className="np-profile-menu-name">{user?.full_name || "User"}</div>
                  <div className="np-profile-menu-email">{user?.email || ""}</div>
                  <div className="np-profile-menu-role">{WORKSPACE_LABELS[roleId] || "Account"}</div>
                </div>
              </div>

              <div className="np-profile-menu-divider" />

              {hasMultipleRoles(user) && <button type="button" className="np-profile-menu-item"
                onClick={() => { setMenuOpen(false); navigate("/choose-workspace"); }}>
                Switch role · {WORKSPACE_LABELS[roleId]} (current)
              </button>}

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
          {isCompany ? <><NavLink to="/dashboard" onClick={closeMobileNavigation}><Grid2X2 size={18} aria-hidden="true" /> Dashboard</NavLink><NavLink to="/company-profile" onClick={closeMobileNavigation}><Building2 size={18} aria-hidden="true" /> Company Profile</NavLink></> : <>
          <NavLink to="/dashboard" onClick={closeMobileNavigation}>
            <Grid2X2 size={18} /> Dashboard
          </NavLink>
          <NavLink to="/requests" onClick={closeMobileNavigation}>
            <Briefcase size={18} /> Requests
          </NavLink>

          {isSuperAdmin && <NavLink to="/admin/inspection-workflows" onClick={closeMobileNavigation}>
            <RouteIcon size={18} /> Inspection Workflow
          </NavLink>}
          {visibleDirectoryGroups.length > 0 && (
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
                    {visibleDirectoryGroups.map((group) => (
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
          )}

          {(isSuperAdmin || roleId === 2) && (
            <NavLink to="/templates" onClick={closeMobileNavigation}>
              <ClipboardList size={18} /> Templates
            </NavLink>
          )}
          {isSuperAdmin && <NavLink to="/admin/client-registrations" onClick={closeMobileNavigation}>
            <Users size={18} /> Client approvals
          </NavLink>}
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
