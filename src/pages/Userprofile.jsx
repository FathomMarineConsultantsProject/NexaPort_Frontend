import { Anchor, Briefcase, Edit3, LogOut, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile, updateMyProfile } from "../api/userApi";
import ConsultantAvatar from "../components/experts/ConsultantAvatar";
import { cacheConsultantPhoto } from "../utils/consultantPhotoCache";
import "./UserProfile.css";

const editFields = [
  ["full_name", "Full name", "text"],
  ["username", "Username", "text"],
  ["phone", "Phone", "tel"],
  ["profile_image", "Profile image URL", "text"],
];

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ full_name: "", username: "", phone: "", profile_image: "" });

  useEffect(() => {
    let active = true;
    getMyProfile().then((response) => {
      if (!active) return;
      const data = response.data;
      setUser(data);
      cacheConsultantPhoto(data);
      localStorage.setItem("np_user", JSON.stringify(data));
      setForm({ full_name: data.full_name || "", username: data.username || "", phone: data.phone || "", profile_image: data.profile_image || "" });
    }).catch(() => { if (active) navigate("/login"); });
    return () => { active = false; };
  }, [navigate]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await updateMyProfile({ full_name: form.full_name, username: form.username, phone: form.phone, profile_image: form.profile_image || null });
      const updated = { ...response.data, expert_id: user.expert_id, photo_url: user.photo_url, photo_expires_at: user.photo_expires_at };
      setUser(updated);
      localStorage.setItem("np_user", JSON.stringify(updated));
      setEdit(false);
      setNotice("Account details saved.");
    } catch (requestError) { setError(requestError.response?.data?.message || "Account details could not be saved. Review the fields and try again."); }
    finally { setSaving(false); }
  };

  const handleLogout = () => { localStorage.removeItem("np_token"); localStorage.removeItem("np_user"); navigate("/login"); };
  if (!user) return <main className="profile-page-wrap"><div className="profile-page-inner" role="status">Loading profile…</div></main>;

  const roleLabel = user.role_name || (user.role_id === 2 ? "Expert" : "Client");
  const memberSince = user.created_at ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric" }).format(new Date(user.created_at)) : "Not provided";
  const details = [["Full name", user.full_name], ["Email", user.email], ["Username", user.username ? `@${user.username}` : null], ["Phone", user.phone], ["Role", roleLabel], ["Member since", memberSince]];

  return <main className="profile-page-wrap"><div className="profile-page-inner">
    <header className="uprofile-head"><ConsultantAvatar className="uprofile-avatar" photoUrl={user.photo_url} name={user.full_name} fallback="U" /><div className="uprofile-head-main"><span className="uprofile-kicker">Account / Profile</span><h1 className="uprofile-name">{user.full_name}</h1><span className="uprofile-role">{user.role_id === 2 ? <Anchor size={15} aria-hidden="true" /> : <Briefcase size={15} aria-hidden="true" />}{roleLabel}</span></div><button type="button" className="uprofile-edit-btn" onClick={() => { setEdit((current) => !current); setError(""); setNotice(""); }}><span aria-hidden="true">{edit ? <X size={17} /> : <Edit3 size={17} />}</span>{edit ? "Cancel Editing" : "Edit Profile"}</button></header>
    {error && <div className="uprofile-message error" role="alert">{error}</div>}{notice && <div className="uprofile-message success" role="status">{notice}</div>}
    <div className="uprofile-layout"><section className="uprofile-card"><div className="uprofile-card-heading"><h2>{edit ? "Edit Account Details" : "Account Details"}</h2><p>{edit ? "Update the details displayed on your Nexaport account." : "Your identity and contact information."}</p></div>
      {edit ? <form className="uprofile-form" onSubmit={handleSave}><div className="uprofile-form-grid">{editFields.map(([key, label, type]) => <label key={key}>{label}<input type={type} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} autoComplete={key === "full_name" ? "name" : key === "phone" ? "tel" : "off"} /></label>)}</div><div className="uprofile-form-actions"><button type="submit" className="uprofile-save-btn" disabled={saving}><Save size={16} aria-hidden="true" />{saving ? "Saving…" : "Save Changes"}</button><button type="button" className="uprofile-cancel-btn" onClick={() => setEdit(false)}>Cancel</button></div></form> : <dl className="uprofile-rows">{details.map(([label, value]) => <div className="uprofile-row" key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}</dl>}
    </section><aside className="uprofile-side"><h2>Account Access</h2><p>Signing out ends this session on this device.</p><button type="button" className="uprofile-logout-btn" onClick={handleLogout}><LogOut size={17} aria-hidden="true" /> Sign Out</button></aside></div>
  </div></main>;
}
