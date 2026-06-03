import {
  Anchor,
  Briefcase,
  Edit3,
  LogOut,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile, updateMyProfile } from "../api/userApi";
import "./Userprofile.css";

export default function UserProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    phone: "",
    profile_image: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getMyProfile();
      const data = res.data;

      setUser(data);
      localStorage.setItem("np_user", JSON.stringify(data));

      setForm({
        full_name: data.full_name || "",
        username: data.username || "",
        phone: data.phone || "",
        profile_image: data.profile_image || "",
      });
    } catch (err) {
      navigate("/login");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const res = await updateMyProfile({
        full_name: form.full_name,
        username: form.username,
        phone: form.phone,
        profile_image: form.profile_image || null,
      });

      setUser(res.data);
      localStorage.setItem("np_user", JSON.stringify(res.data));
      setEdit(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("np_token");
    localStorage.removeItem("np_user");
    navigate("/login");
  };

  if (!user) return null;

  const initial = user.full_name?.trim()?.[0]?.toUpperCase() || "U";
  const roleLabel = user.role_name || (user.role_id === 2 ? "Expert" : "Client");
  const roleIcon = user.role_id === 2 ? <Anchor size={16} /> : <Briefcase size={16} />;

  return (
    <div className="profile-page-wrap">
      <div className="profile-page-inner">
        <div className="uprofile-head">
          <div className="uprofile-avatar">{initial}</div>

          <div className="uprofile-head-main">
            <h1 className="uprofile-name">{user.full_name}</h1>
            <div className="uprofile-role">
              {roleIcon}
              {roleLabel}
            </div>
          </div>

          <button className="uprofile-edit-btn" onClick={() => setEdit(!edit)}>
            {edit ? <X size={16} /> : <Edit3 size={16} />}
            {edit ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="uprofile-card">
          <h2 className="uprofile-card-title">
            <User size={18} /> Account Details
          </h2>

          {edit ? (
            <div className="uprofile-form">
              <label>
                Full Name
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </label>

              <label>
                Username
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </label>

              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label>
                Profile Image URL
                <input
                  value={form.profile_image}
                  onChange={(e) => setForm({ ...form, profile_image: e.target.value })}
                />
              </label>

              <button className="uprofile-save-btn" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <div className="uprofile-rows">
              <InfoRow icon={<User size={14} />} label="Full Name" value={user.full_name} />
              <InfoRow icon={<Mail size={14} />} label="Email" value={user.email} />
              <InfoRow icon={<User size={14} />} label="Username" value={`@${user.username}`} />
              <InfoRow icon={<Phone size={14} />} label="Phone" value={user.phone || "—"} />
              <InfoRow icon={<Shield size={14} />} label="Role" value={roleLabel} />
              <InfoRow
                icon={<Anchor size={14} />}
                label="Member Since"
                value={
                  user.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </div>
          )}
        </div>

        <button className="uprofile-logout-btn" onClick={handleLogout}>
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="uprofile-row">
      <span className="uprofile-row-label">
        {icon} {label}
      </span>
      <span className="uprofile-row-value">{value}</span>
    </div>
  );
}