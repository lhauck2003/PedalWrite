import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, Bike, Mail,
  BarChart2, BookOpen, Users, UserCheck, Shield, Save,
  UserCog, Link, Unlink, Calendar,
} from "lucide-react";
import {
  useSkills, useRiders, useCaregivers,
  useBikes, useBikeSpecs, useGeneralStats, useSessions, useUsers,
  useLeaders,
} from "../store/hooks";
import {
  createSkill, updateSkill, deleteSkill,
  createRider, updateRider, deleteRider,
  createBike, updateBike, deleteBike,
  createBikeSpecs, updateBikeSpecs, deleteBikeSpecs,
  updateAccountRole,
  ApiSkill, ApiRider, ApiBike, ApiBikeSpecs,
  createSession, updateSession, deleteSession, ApiSession,
} from "../store/api";

type Section = "skills" | "riders" | "caregivers" | "leaders" | "bikes" | "overview" | "sessions";

const SECTION_META: Record<Section, { title: string; icon: React.ElementType }> = {
  skills:     { title: "Manage Skills",     icon: BookOpen  },
  riders:     { title: "Manage Riders",     icon: Users     },
  caregivers: { title: "Manage Caregivers", icon: UserCheck },
  leaders:    { title: "Manage Leaders",    icon: Shield    },
  bikes:      { title: "Bike Inventory",    icon: Bike      },
  overview:   { title: "Totals Overview",   icon: BarChart2 },
  sessions:   { title: "Manage Sessions",   icon: Calendar  },
};

export function AdminManagePage() {
  const navigate = useNavigate();
  const { section } = useParams<{ section: Section }>();
  const s = (section ?? "overview") as Section;
  const meta = SECTION_META[s] ?? SECTION_META.overview;

  return (
    <div className="flex flex-col min-h-full bg-background">
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <meta.icon size={18} className="text-primary" />
          <h1 className="text-foreground" style={{ fontSize: "18px", fontWeight: 600 }}>{meta.title}</h1>
        </div>
      </div>
      <div className="flex-1 px-5 py-4">
        {s === "skills"     && <SkillsSection />}
        {s === "riders"     && <RidersSection />}
        {s === "caregivers" && <CaregiversSection />}
        {s === "leaders"    && <LeadersSection />}
        {s === "bikes"      && <BikesSection />}
        {s === "overview"   && <OverviewSection />}
        {s === "sessions"   && <SessionsSection />}
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
function ErrMsg({ msg }: { msg: string }) {
  return <p className="text-red-500 text-center py-2" style={{ fontSize: "12px" }}>{msg}</p>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-muted-foreground mb-1"
        style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
const inputCls = "w-full bg-background rounded-xl border border-border px-3 py-2.5 text-foreground outline-none focus:border-primary transition-colors";
const inputSmCls = "w-full bg-background rounded-lg border border-border px-3 py-2 text-foreground outline-none focus:border-primary transition-colors";

// ─── Skills ───────────────────────────────────────────────────────────────────

function SkillsSection() {
  const { data: skills, loading, error, refetch: refetchSkills } = useSkills();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const blankForm = { skillname: "", formlevel: 1, category: ""};
  const [form, setForm]       = useState(blankForm);
  const [editForm, setEditForm] = useState<Partial<ApiSkill>>({});

  const handleAdd = async () => {
    if (!form.skillname.trim()) return;
    setSaving(true); setSaveErr(null);
    try {
      await createSkill({ skillname: form.skillname, formlevel: form.formlevel, category: form.category });
      await refetchSkills()
      setForm(blankForm); setShowAdd(false); refetchSkills();
    } catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    setSaving(true); setSaveErr(null);
    try { await updateSkill(id, editForm); await refetchSkills(); setEditId(null); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    try { await deleteSkill(id); refetchSkills(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
  };

  const levels = [1, 2, 3, 4];
  const categories = ["Bicycle Skills", "Resilience", "Persistence", "Communication"]
  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl"
        style={{ fontSize: "14px", fontWeight: 600 }}>
        <Plus size={18} /> Add Skill
      </button>

      {showAdd && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>New Skill</p>
          <Field label="Category">
            <div className="flex gap-2">
              {categories.map((l) => (
                <button key={l} onClick={() => setForm((f) => ({ ...f, category: l }))}
                  className={`flex-1 py-2.5 rounded-xl border transition-colors ${form.category === l ? "bg-primary text-white border-primary" : "border-border text-foreground"}`}
                  style={{ fontSize: "13px", fontWeight: 600 }}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Skill name">
            <input className={inputCls} style={{ fontSize: "14px" }} placeholder="e.g. Controlled stop from slow speed"
              value={form.skillname} onChange={(e) => setForm((f) => ({ ...f, skillname: e.target.value }))} />
          </Field>
          <Field label="Level">
            <div className="flex gap-2">
              {levels.map((l) => (
                <button key={l} onClick={() => setForm((f) => ({ ...f, formlevel: l }))}
                  className={`flex-1 py-2.5 rounded-xl border transition-colors ${form.formlevel === l ? "bg-primary text-white border-primary" : "border-border text-foreground"}`}
                  style={{ fontSize: "13px", fontWeight: 600 }}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          {saveErr && <ErrMsg msg={saveErr} />}
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setForm(blankForm); }}
              className="flex-1 bg-muted text-foreground py-2.5 rounded-xl border border-border" style={{ fontSize: "13px" }}>
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 bg-primary text-white py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ fontSize: "13px", fontWeight: 600 }}>
              {saving ? <Spinner /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      )}

      {levels.map((level) => {
        const levelSkills = (skills ?? []).filter((s) => s.formlevel === level);
        if (levelSkills.length === 0) return null;
        return (
          <div key={level}>
            <p className="text-muted-foreground mb-2"
              style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Level {level}
            </p>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {levelSkills.map((skill, i) => (
                <div key={skill.id} className={i < levelSkills.length - 1 ? "border-b border-border" : ""}>
                  {editId === skill.id ? (
                    <div className="px-4 py-3 space-y-2">
                      <Field label="Category">
                        <div className="flex gap-2">
                          {categories.map((l) => (
                            <button
                              key={l}
                              onClick={() => setEditForm((f) => ({ ...f, category: l }))}
                              className={`flex-1 py-2.5 rounded-xl border transition-colors ${
                                editForm.category === l
                                  ? "bg-primary text-white border-primary"
                                  : "border-border text-foreground"
                              }`}
                              style={{ fontSize: "13px", fontWeight: 600 }}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <input className={inputSmCls} style={{ fontSize: "13px" }}
                        defaultValue={skill.skillname}
                        onChange={(e) => setEditForm((f) => ({ ...f, skillname: e.target.value }))} />
                      <div className="flex gap-2">
                        {levels.map((l) => (
                          <button key={l} onClick={() => setEditForm((f) => ({ ...f, formlevel: l }))}
                            className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                              (editForm.formlevel ?? skill.formlevel) === l ? "bg-primary text-white border-primary" : "border-border text-foreground"
                            }`}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {setEditId(null); setEditForm({ skillname: skill.skillname, formlevel: skill.formlevel, category: skill.category });}}
                          className="flex-1 bg-muted text-foreground py-2 rounded-lg border border-border" style={{ fontSize: "12px" }}>
                          Cancel
                        </button>
                        <button onClick={() => handleEdit(skill.id)} disabled={saving}
                          className="flex-1 bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60"
                          style={{ fontSize: "12px", fontWeight: 600 }}>
                          {saving ? <Spinner /> : <Check size={13} />} Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <p className="flex-1 text-foreground" style={{ fontSize: "13px" }}>{skill.skillname}</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditId(skill.id); setEditForm({ skillname: skill.skillname, formlevel: skill.formlevel, category: skill.category }); }}
                          className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                          <Edit2 size={12} className="text-primary" />
                        </button>
                        <button onClick={() => handleDelete(skill.id)}
                          className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                          <Trash2 size={12} className="text-destructive" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Riders ───────────────────────────────────────────────────────────────────

function RidersSection() {
  const { data: riders, loading, error, refetch } = useRiders();
  const { data: sessions } = useSessions();
  const { data: caregivers } = useCaregivers();
  const { data: leaders } = useLeaders();

  const [showAdd, setShowAdd]   = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saveErr, setSaveErr]   = useState<string | null>(null);

  const blank = { firstname: "", lastname: "", isquickstart: false, session: null as string | null, leader: null as string | null };
  const [form, setForm]         = useState(blank);
  const [editForm, setEditForm] = useState<Partial<ApiRider>>({});

  // Leaders = accounts with role "leader" that have a leader_id FK

  const handleAdd = async () => {
    if (!form.firstname.trim() || !form.lastname.trim()) { setSaveErr("First and last name required."); return; }
    setSaving(true); setSaveErr(null);
    try {
      await createRider({
        firstname: form.firstname,
        lastname: form.lastname,
        isquickstart: form.isquickstart,
        session: form.session,
        leader: form.leader,
      });
      setForm(blank); setShowAdd(false); refetch();
    } catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    setSaving(true); setSaveErr(null);
    try { await updateRider(id, editForm); setEditId(null); refetch(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rider? This cannot be undone.")) return;
    try { await deleteRider(id); refetch(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
  };

  // Caregiver linking
  const handleLinkCaregiver = async ( riderId: string, caregiverId: string) => {
    const rider = riders?.find(r => r.id === riderId);

    if (!rider) return;

    await updateRider(riderId, {
      caregivers: [
        ...(rider.caregivers ?? []),
        caregiverId,
      ],
    });

    refetch();
  };

  const handleUnlinkCaregiver = async (riderId: string, caregiverId: string) => {
    const rider = riders?.find(r => r.id === riderId);

    if (!rider) return;

    await updateRider(riderId, {
      caregivers: (rider.caregivers ?? []).filter(
        id => id !== caregiverId
      ),
    });

    refetch();
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl"
        style={{ fontSize: "14px", fontWeight: 600 }}>
        <Plus size={18} /> Add Rider
      </button>

      {showAdd && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>New Rider</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="First name">
              <input className={inputCls} style={{ fontSize: "14px" }} placeholder="First name"
                value={form.firstname} onChange={(e) => setForm((f) => ({ ...f, firstname: e.target.value }))} />
            </Field>
            <Field label="Last name">
              <input className={inputCls} style={{ fontSize: "14px" }} placeholder="Last name"
                value={form.lastname} onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))} />
            </Field>
          </div>
          <Field label="Session">
            <select className={inputCls} style={{ fontSize: "14px" }}
              value={form.session ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, session: e.target.value ? String(e.target.value) : null }))}>
              <option value="">No session</option>
              {(sessions ?? []).map((s) => <option key={s.id} value={s.id}>Session {s.sessionnumber}</option>)}
            </select>
          </Field>
          <Field label="Leader">
            <select className={inputCls} style={{ fontSize: "14px" }}
              value={form.leader ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, leader: e.target.value ? String(e.target.value) : null }))}>
              <option value="">No leader</option>
              {leaders?.map((l) => <option key={l.id} value={l.id}>{l.firstname}{l.lastname}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isquickstart}
              onChange={(e) => setForm((f) => ({ ...f, isquickstart: e.target.checked }))}
              className="w-4 h-4 rounded accent-primary" />
            <span className="text-foreground" style={{ fontSize: "13px" }}>Quickstart rider</span>
          </label>
          {saveErr && <ErrMsg msg={saveErr} />}
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setForm(blank); setSaveErr(null); }}
              className="flex-1 bg-muted text-foreground py-2.5 rounded-xl border border-border" style={{ fontSize: "13px" }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 bg-primary text-white py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ fontSize: "13px", fontWeight: 600 }}>
              {saving ? <Spinner /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      )}

      {saveErr && !showAdd && <ErrMsg msg={saveErr} />}

      <div className="space-y-2">
        {(riders ?? []).length === 0 && (
          <div className="bg-card rounded-2xl border border-border px-4 py-5 text-center">
            <p className="text-muted-foreground" style={{ fontSize: "13px" }}>No riders yet</p>
          </div>
        )}
        {(riders ?? []).map((rider) => {
          const linkedCaregiverIds = rider.caregivers ?? [];
          const unlinkableCaregivers = (caregivers ?? []).filter(cg => linkedCaregiverIds.includes(cg.id));
          const linkableCaregivers = (caregivers ?? []).filter(cg => !linkedCaregiverIds.includes(cg.id));

          return (
            <div key={rider.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              {editId === rider.id ? (
                <div className="px-4 py-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputSmCls} style={{ fontSize: "13px" }} placeholder="First name"
                      defaultValue={rider.firstname}
                      onChange={(e) => setEditForm((f) => ({ ...f, firstname: e.target.value }))} />
                    <input className={inputSmCls} style={{ fontSize: "13px" }} placeholder="Last name"
                      defaultValue={rider.lastname}
                      onChange={(e) => setEditForm((f) => ({ ...f, lastname: e.target.value }))} />
                  </div>
                  <Field label="Session">
                    <select className={inputSmCls} style={{ fontSize: "12px" }}
                      defaultValue={rider.session ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, session: e.target.value ? String(e.target.value) : null }))}>
                      <option value="">No session</option>
                      {(sessions ?? []).map((s) => <option key={s.id} value={s.id}>Session {s.sessionnumber}</option>)}
                    </select>
                  </Field>
                  <Field label="Leader">
                    <select className={inputSmCls} style={{ fontSize: "12px" }}
                      defaultValue={rider.leader ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, leader: e.target.value ? String(e.target.value) : null }))}>
                      <option value="">No leader</option>
                      {leaders?.map((l) => <option key={l.id} value={l.id}>{l.firstname} {l.lastname}</option>)}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 cursor-pointer px-1">
                    <input type="checkbox" defaultChecked={rider.isquickstart}
                      onChange={(e) => setEditForm((f) => ({ ...f, isquickstart: e.target.checked }))}
                      className="w-4 h-4 rounded accent-primary" />
                    <span className="text-foreground" style={{ fontSize: "12px" }}>Quickstart rider</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setEditId(null)}
                      className="flex-1 bg-muted text-foreground py-2 rounded-lg border border-border" style={{ fontSize: "12px" }}>Cancel</button>
                    <button onClick={() => handleEdit(rider.id)} disabled={saving}
                      className="flex-1 bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60"
                      style={{ fontSize: "12px", fontWeight: 600 }}>
                      {saving ? <Spinner /> : <Check size={13} />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Rider row */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                      <span className="text-white" style={{ fontSize: "14px", fontWeight: 700 }}>
                        {rider.firstname.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                        {rider.firstname} {rider.lastname}
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                        {rider.leader_name ? `Leader: ${rider.leader_name}` : "No leader"}
                        {rider.session_number ? ` · Session ${rider.session_number}` : ""}
                        {rider.isquickstart ? " · Quickstart" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditId(rider.id); setEditForm({ firstname: rider.firstname, lastname: rider.lastname, isquickstart: rider.isquickstart, session: rider.session, leader: rider.leader }); }}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                        <Edit2 size={12} className="text-primary" />
                      </button>
                      <button onClick={() => handleDelete(rider.id)}
                        className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <Trash2 size={12} className="text-destructive" />
                      </button>
                    </div>
                  </div>

                  {/* Caregiver links */}
                  <div className="px-4 py-2 bg-muted/20">
                    <p className="text-muted-foreground mb-1.5" style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Caregivers
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {unlinkableCaregivers.length === 0 && (
                        <span className="text-muted-foreground" style={{ fontSize: "11px" }}>None assigned</span>
                      )}
                      {unlinkableCaregivers.map((cg) => (
                        <div
                          key={cg.id}
                          className="flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1"
                        >
                          <span
                            className="text-foreground"
                            style={{ fontSize: "11px" }}
                          >
                            {cg.firstname}{cg.lastname}
                          </span>

                          <button
                            onClick={() =>
                              handleUnlinkCaregiver(rider.id, cg.id)
                            }
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Unlink size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {linkableCaregivers.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Link size={11} className="text-muted-foreground shrink-0" />
                        <select
                          className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-foreground outline-none"
                          style={{ fontSize: "11px" }}
                          value=""
                          onChange={(e) => { if (e.target.value) handleLinkCaregiver(rider.id, String(e.target.value)); }}>
                          <option value="">Assign caregiver…</option>
                          {linkableCaregivers.map((cg) => (
                            <option key={cg.id} value={cg.id}>{cg.firstname}{cg.lastname}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Caregivers ───────────────────────────────────────────────────────────────

function CaregiversSection() {
  const { data: caregivers, loading, error } = useCaregivers();
  const { data: users, refetch: refetchUsers } = useUsers();
  const [saving, setSaving] = useState<string | null>(null); // holds account_id being saved
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Accounts that currently have caregiver role or anonymous (eligible to become caregivers)
  const eligibleAccounts = (users ?? []).filter(
    (u) => u.account_id && (u.role === "caregiver" || u.role === "anonymous" || u.role === null)
  );
  const caregiverAccounts = (users ?? []).filter((u) => u.role === "caregiver");

  const handleSetRole = async (accountId: string, role: "caregiver" | "anonymous") => {
    setSaving(accountId); setSaveErr(null);
    try { await updateAccountRole(accountId, role); refetchUsers(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div className="space-y-4">
      <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex gap-3">
        <UserCog size={18} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>Assigning caregivers</p>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: "12px", lineHeight: "1.5" }}>
            Anyone who has signed in with Google appears below. Set their role to <strong>caregiver</strong> here,
            then link them to riders from the Riders section. You'll also need to create a Caregiver record in
            Django admin and link the Account FK.
          </p>
        </div>
      </div>

      {saveErr && <ErrMsg msg={saveErr} />}

      {/* Accounts with caregiver role */}
      <div>
        <p className="text-muted-foreground mb-2"
          style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Current Caregivers
        </p>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {caregiverAccounts.length === 0 && (
            <p className="px-4 py-4 text-muted-foreground text-center" style={{ fontSize: "13px" }}>
              No caregiver accounts yet
            </p>
          )}
          {caregiverAccounts.map((u, i) => {
            const cg = (caregivers ?? []).find((c) => c.email === u.email);
            const riderCount = cg?.riders?.length ?? 0; 
            return (
              <div key={u.uid}
                className={`flex items-center gap-3 px-4 py-3 ${i < caregiverAccounts.length - 1 ? "border-b border-border" : ""}`}>
                <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <span className="text-accent" style={{ fontSize: "14px", fontWeight: 700 }}>
                    {u.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                    {cg?.name ?? u.email}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail size={10} className="text-muted-foreground" />
                    <p className="text-muted-foreground truncate" style={{ fontSize: "11px" }}>{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    {riderCount} rider{riderCount !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => handleSetRole(u.account_id!, "anonymous")}
                    disabled={saving === u.account_id}
                    className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive flex items-center gap-1 disabled:opacity-50"
                    style={{ fontSize: "11px", fontWeight: 600 }}>
                    {saving === u.account_id ? <Spinner /> : <Unlink size={11} />} Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eligible accounts (signed in, not yet caregivers) */}
      {eligibleAccounts.filter((u) => u.role !== "caregiver").length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2"
            style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Assign Caregiver Role
          </p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {eligibleAccounts.filter((u) => u.role !== "caregiver").map((u, i, arr) => (
              <div key={u.uid}
                className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <span className="text-muted-foreground" style={{ fontSize: "14px", fontWeight: 700 }}>
                    {u.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground truncate" style={{ fontSize: "13px" }}>{u.email}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    Role: {u.role ?? "none"}
                  </p>
                </div>
                <button
                  onClick={() => handleSetRole(u.account_id!, "caregiver")}
                  disabled={saving === u.account_id}
                  className="px-2.5 py-1.5 rounded-lg bg-primary text-white flex items-center gap-1 disabled:opacity-50"
                  style={{ fontSize: "11px", fontWeight: 600 }}>
                  {saving === u.account_id ? <Spinner /> : <UserCog size={11} />} Make Caregiver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Leaders ─────────────────────────────────────────────────────────────────

function LeadersSection() {
  const { data: users, loading, error, refetch: refetchUsers } = useUsers();
  const [saving, setSaving] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const leaderAccounts    = (users ?? []).filter((u) => u.role === "leader");
  const assignableAccounts = (users ?? []).filter(
    (u) => u.account_id && u.role !== "leader" && u.role !== "admin"
  );

  const handleSetRole = async (accountId: string, role: "leader" | "anonymous") => {
    setSaving(accountId); setSaveErr(null);
    try { await updateAccountRole(accountId, role); refetchUsers(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div className="space-y-4">
      <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex gap-3">
        <UserCog size={18} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>Assigning leaders</p>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: "12px", lineHeight: "1.5" }}>
            Set a signed-in account's role to <strong>leader</strong> here. You'll also need to create a
            Leader record in <span className="font-mono text-accent">/admin</span> (Django admin) and link
            the Account's Leader FK so riders can be assigned to them.
          </p>
        </div>
      </div>

      {saveErr && <ErrMsg msg={saveErr} />}

      {/* Current leaders */}
      <div>
        <p className="text-muted-foreground mb-2"
          style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Current Leaders
        </p>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {leaderAccounts.length === 0 && (
            <p className="px-4 py-4 text-muted-foreground text-center" style={{ fontSize: "13px" }}>
              No leader accounts yet
            </p>
          )}
          {leaderAccounts.map((u, i) => (
            <div key={u.uid}
              className={`flex items-center gap-3 px-4 py-3 ${i < leaderAccounts.length - 1 ? "border-b border-border" : ""}`}>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary" style={{ fontSize: "14px", fontWeight: 700 }}>
                  {u.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>{u.email}</p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>Leader</p>
              </div>
              <button
                onClick={() => handleSetRole(u.account_id!, "anonymous")}
                disabled={saving === u.account_id}
                className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive flex items-center gap-1 disabled:opacity-50"
                style={{ fontSize: "11px", fontWeight: 600 }}>
                {saving === u.account_id ? <Spinner /> : <Unlink size={11} />} Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Assignable accounts */}
      {assignableAccounts.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2"
            style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Assign Leader Role
          </p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {assignableAccounts.map((u, i, arr) => (
              <div key={u.uid}
                className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <span className="text-muted-foreground" style={{ fontSize: "14px", fontWeight: 700 }}>
                    {u.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate" style={{ fontSize: "13px" }}>{u.email}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    Current role: {u.role ?? "none"}
                  </p>
                </div>
                <button
                  onClick={() => handleSetRole(u.account_id!, "leader")}
                  disabled={saving === u.account_id}
                  className="px-2.5 py-1.5 rounded-lg bg-primary text-white flex items-center gap-1 disabled:opacity-50"
                  style={{ fontSize: "11px", fontWeight: 600 }}>
                  {saving === u.account_id ? <Spinner /> : <UserCog size={11} />} Make Leader
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bikes ────────────────────────────────────────────────────────────────────

function BikesSection() {
  const { data: bikes, loading, error, refetch } = useBikes();
  const { data: allSpecs, refetch: refetchSpecs } = useBikeSpecs();
  const { data: riders } = useRiders();
  const [showAdd, setShowAdd]   = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [addSpecForBike, setAddSpecForBike] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saveErr, setSaveErr]   = useState<string | null>(null);

  const blankBike = { name: "", size: "" };
  const blankSpec = { rider: null as string | null, day: 1, seat_height: 0, left_piston: 0, right_piston: 0 };
  const [bikeForm, setBikeForm]   = useState(blankBike);
  const [editBike, setEditBike]   = useState<Partial<ApiBike>>({});
  const [specForm, setSpecForm]   = useState(blankSpec);

  const handleAddBike = async () => {
    if (!bikeForm.name.trim()) return;
    setSaving(true); setSaveErr(null);
    try {
      await createBike({ name: bikeForm.name, size: bikeForm.size });
      setBikeForm(blankBike); setShowAdd(false); refetch();
    } catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleEditBike = async (id: string) => {
    setSaving(true); setSaveErr(null);
    try { await updateBike(id, editBike); setEditId(null); refetch(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDeleteBike = async (id: string) => {
    if (!confirm("Delete this bike?")) return;
    try { await deleteBike(id); refetch(); refetchSpecs(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
  };

  const handleAddSpec = async (bikeId: string) => {
    setSaving(true); setSaveErr(null);
    try {
      await createBikeSpecs({ bike: bikeId, ...specForm });
      setSpecForm(blankSpec); setAddSpecForBike(null); refetchSpecs();
    } catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDeleteSpec = async (id: number) => {
    try { await deleteBikeSpecs(id); refetchSpecs(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl"
        style={{ fontSize: "14px", fontWeight: 600 }}>
        <Plus size={18} /> Add Bike
      </button>

      {showAdd && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>New Bike</p>
          <Field label="Name">
            <input className={inputCls} style={{ fontSize: "14px" }} placeholder="e.g. Trek Precaliber 20"
              value={bikeForm.name} onChange={(e) => setBikeForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Size">
            <input className={inputCls} style={{ fontSize: "14px" }} placeholder='e.g. 20"'
              value={bikeForm.size} onChange={(e) => setBikeForm((f) => ({ ...f, size: e.target.value }))} />
          </Field>
          {saveErr && <ErrMsg msg={saveErr} />}
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setBikeForm(blankBike); }}
              className="flex-1 bg-muted text-foreground py-2.5 rounded-xl border border-border" style={{ fontSize: "13px" }}>Cancel</button>
            <button onClick={handleAddBike} disabled={saving}
              className="flex-1 bg-primary text-white py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ fontSize: "13px", fontWeight: 600 }}>
              {saving ? <Spinner /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      )}

      {saveErr && !showAdd && <ErrMsg msg={saveErr} />}

      <div className="space-y-3">
        {(bikes ?? []).length === 0 && (
          <div className="bg-card rounded-2xl border border-border px-4 py-5 text-center">
            <p className="text-muted-foreground" style={{ fontSize: "13px" }}>No bikes yet</p>
          </div>
        )}
        {(bikes ?? []).map((bike) => {
          const specs = (allSpecs ?? []).filter((s) => s.bike === bike.id);
          return (
            <div key={bike.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Bike header */}
              {editId === bike.id ? (
                <div className="px-4 py-3 space-y-2 border-b border-border">
                  <input className={inputSmCls} style={{ fontSize: "13px" }} placeholder="Name"
                    defaultValue={bike.name}
                    onChange={(e) => setEditBike((f) => ({ ...f, name: e.target.value }))} />
                  <input className={inputSmCls} style={{ fontSize: "13px" }} placeholder="Size"
                    defaultValue={bike.size}
                    onChange={(e) => setEditBike((f) => ({ ...f, size: e.target.value }))} />
                  <div className="flex gap-2">
                    <button onClick={() => setEditId(null)}
                      className="flex-1 bg-muted text-foreground py-2 rounded-lg border border-border" style={{ fontSize: "12px" }}>Cancel</button>
                    <button onClick={() => handleEditBike(bike.id)} disabled={saving}
                      className="flex-1 bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60"
                      style={{ fontSize: "12px", fontWeight: 600 }}>
                      {saving ? <Spinner /> : <Check size={13} />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Bike size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>{bike.name}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                      Size: {bike.size || "—"} · {bike.riders.length} rider{bike.riders.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditId(bike.id); setEditBike({ name: bike.name, size: bike.size }); }}
                      className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                      <Edit2 size={12} className="text-primary" />
                    </button>
                    <button onClick={() => handleDeleteBike(bike.id)}
                      className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Trash2 size={12} className="text-destructive" />
                    </button>
                  </div>
                </div>
              )}

              {/* Specs rows */}
              {specs.map((spec, i) => {
                const riderName = riders?.find((r) => r.id === spec.rider);
                return (
                  <div key={spec.id}
                    className={`flex items-center gap-3 px-4 py-2.5 bg-muted/30 ${i < specs.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
                        {spec.day} · {riderName ? `${riderName.firstname} ${riderName.lastname}` : "No rider"}
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                        Seat {spec.seat_height}cm · L piston {spec.left_piston} · R piston {spec.right_piston}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteSpec(spec.id)}
                      className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <Trash2 size={11} className="text-destructive" />
                    </button>
                  </div>
                );
              })}

              {/* Add spec row */}
              {addSpecForBike === bike.id ? (
                <div className="px-4 py-3 space-y-2 bg-secondary/20 border-t border-border">
                  <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>Add Spec Record</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Day">
                      <input type="number" className={inputSmCls} style={{ fontSize: "12px" }} min={1} max={5}
                        value={specForm.day}
                        onChange={(e) => setSpecForm((f) => ({ ...f, day: Number(e.target.value) }))} />
                    </Field>
                    <Field label="Rider">
                      <select className={inputSmCls} style={{ fontSize: "12px" }}
                        value={specForm.rider ?? ""}
                        onChange={(e) => setSpecForm((f) => ({ ...f, rider: e.target.value ? String(e.target.value) : null }))}>
                        <option value="">No rider</option>
                        {(riders ?? []).map((r) => (
                          <option key={r.id} value={r.id}>{r.firstname} {r.lastname}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["seat_height", "left_piston", "right_piston"] as const).map((field) => (
                      <Field key={field} label={field.replace("_", " ")}>
                        <input type="number" className={inputSmCls} style={{ fontSize: "12px" }}
                          value={specForm[field]}
                          onChange={(e) => setSpecForm((f) => ({ ...f, [field]: Number(e.target.value) }))} />
                      </Field>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAddSpecForBike(null)}
                      className="flex-1 bg-muted text-foreground py-2 rounded-lg border border-border" style={{ fontSize: "12px" }}>Cancel</button>
                    <button onClick={() => handleAddSpec(bike.id)} disabled={saving}
                      className="flex-1 bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60"
                      style={{ fontSize: "12px", fontWeight: 600 }}>
                      {saving ? <Spinner /> : <Check size={13} />} Save Spec
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddSpecForBike(bike.id); setSpecForm(blankSpec); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-primary border-t border-border"
                  style={{ fontSize: "12px", fontWeight: 600 }}>
                  <Plus size={13} /> Add spec record
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewSection() {
  const { data: stats, loading } = useGeneralStats();
  const { data: bikes }          = useBikes();
  const { data: riders }         = useRiders();
  const { data: caregivers }     = useCaregivers();
  const { data: sessions }       = useSessions();

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;

  const totals = [
    { label: "Riders",       value: stats?.riders      ?? "—" },
    { label: "Daily Forms",  value: stats?.daily_forms ?? "—" },
    { label: "Final Forms",  value: stats?.final_forms ?? "—" },
    { label: "Sessions",     value: stats?.sessions    ?? "—" },
    { label: "Bikes",        value: bikes?.length      ?? "—" },
    { label: "Caregivers",   value: caregivers?.length ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {totals.map((t) => (
          <div key={t.label} className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-primary" style={{ fontSize: "24px", fontWeight: 700 }}>{t.value}</p>
            <p className="text-muted-foreground" style={{ fontSize: "11px" }}>{t.label}</p>
          </div>
        ))}
      </div>

      {/* Sessions */}
      <div>
        <p className="text-muted-foreground mb-2"
          style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Sessions
        </p>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {(sessions ?? []).length === 0 ? (
            <p className="px-4 py-4 text-muted-foreground text-center" style={{ fontSize: "13px" }}>No sessions</p>
          ) : (
            (sessions ?? []).map((s, i) => (
              <div key={s.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < (sessions ?? []).length - 1 ? "border-b border-border" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-primary" style={{ fontSize: "12px", fontWeight: 700 }}>{s.sessionnumber}</span>
                </div>
                <div className="flex-1">
                  <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                    Session {s.sessionnumber}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    {s.starttime ? new Date(s.starttime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                    {s.endtime ? ` – ${new Date(s.endtime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                  </p>
                </div>
                <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  {(riders ?? []).filter((r) => r.session === s.id).length} riders
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Caregivers */}
      <div>
        <p className="text-muted-foreground mb-2"
          style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Caregivers
        </p>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {(caregivers ?? []).length === 0 ? (
            <p className="px-4 py-4 text-muted-foreground text-center" style={{ fontSize: "13px" }}>No caregivers</p>
          ) : (
            (caregivers ?? []).map((cg, i) => {
              const count = cg?.riders?.length ?? 0;
              return (
                <div key={cg.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < (caregivers ?? []).length - 1 ? "border-b border-border" : ""}`}>
                  <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>
                      {cg.firstname.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>{cg.name}</p>
                    <p className="text-muted-foreground truncate" style={{ fontSize: "11px" }}>{cg.email}</p>
                  </div>
                  <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    {count} rider{count !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Unassigned riders */}
      <div>
        <p className="text-muted-foreground mb-2"
          style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Unassigned Riders
        </p>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {(riders ?? []).filter((r) => !r.leader).length === 0 ? (
            <p className="px-4 py-4 text-muted-foreground text-center" style={{ fontSize: "13px" }}>All riders assigned ✓</p>
          ) : (
            (riders ?? []).filter((r) => !r.leader).map((rider, i, arr) => (
              <div key={rider.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"
                  style={{ fontSize: "12px", fontWeight: 700 }}>
                  {rider.firstname.charAt(0)}
                </div>
                <p className="text-foreground" style={{ fontSize: "13px" }}>
                  {rider.firstname} {rider.lastname}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
// ─── Sessions ─────────────────────────────────────────────────────────────────

function SessionsSection() {
  const { data: sessions, loading, error, refetch } = useSessions();
  const { data: riders } = useRiders();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId]   = useState<string | number | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const blank = { sessionnumber: 1, starttime: "", endtime: "" };
  const [form, setForm]         = useState(blank);
  const [editForm, setEditForm] = useState<Partial<ApiSession>>({});

  const handleAdd = async () => {
    if (!form.starttime) { setSaveErr("Start time is required."); return; }
    setSaving(true); setSaveErr(null);
    try {
      await createSession({
        sessionnumber: form.sessionnumber,
        starttime: form.starttime,
        endtime: form.endtime || undefined,
      });
      setForm(blank); setShowAdd(false); refetch();
    } catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    setSaving(true); setSaveErr(null);
    try { await updateSession(id, editForm); setEditId(null); refetch(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session? Riders assigned to it will be unlinked.")) return;
    try { await deleteSession(id); refetch(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed"); }
  };

  const riderCount = (sessionId: string | number) =>
    (riders ?? []).filter((r) => r.session === sessionId).length;

  const fmtDate = (iso: string ) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error)   return <ErrMsg msg={error} />;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl"
        style={{ fontSize: "14px", fontWeight: 600 }}>
        <Plus size={18} /> Add Session
      </button>

      {showAdd && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>New Session</p>
          <Field label="Session number">
            <input
              type="number"
              className={inputCls}
              style={{ fontSize: "14px" }}
              value={form.sessionnumber}
              min={1}
              onChange={(e) => setForm((f) => ({ ...f, sessionnumber: Number(e.target.value) }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start date / time">
              <input
                type="datetime-local"
                className={inputCls}
                style={{ fontSize: "13px" }}
                value={form.starttime}
                onChange={(e) => setForm((f) => ({ ...f, starttime: e.target.value }))}
              />
            </Field>
            <Field label="End date / time">
              <input
                type="datetime-local"
                className={inputCls}
                style={{ fontSize: "13px" }}
                value={form.endtime}
                onChange={(e) => setForm((f) => ({ ...f, endtime: e.target.value }))}
              />
            </Field>
          </div>
          {saveErr && <ErrMsg msg={saveErr} />}
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setForm(blank); setSaveErr(null); }}
              className="flex-1 bg-muted text-foreground py-2.5 rounded-xl border border-border"
              style={{ fontSize: "13px" }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 bg-primary text-white py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ fontSize: "13px", fontWeight: 600 }}>
              {saving ? <Spinner /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      )}

      {saveErr && !showAdd && <ErrMsg msg={saveErr} />}

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {(sessions ?? []).length === 0 && (
          <p className="px-4 py-5 text-muted-foreground text-center" style={{ fontSize: "13px" }}>
            No sessions yet
          </p>
        )}
        {(sessions ?? []).map((session, i) => (
          <div key={session.id} className={i < (sessions ?? []).length - 1 ? "border-b border-border" : ""}>
            {editId === session.id ? (
              <div className="px-4 py-3 space-y-2">
                <Field label="Session number">
                  <input
                    type="number"
                    className={inputSmCls}
                    style={{ fontSize: "13px" }}
                    defaultValue={session.sessionnumber}
                    onChange={(e) => setEditForm((f) => ({ ...f, sessionnumber: Number(e.target.value) }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start">
                    <input
                      type="datetime-local"
                      className={inputSmCls}
                      style={{ fontSize: "12px" }}
                      defaultValue={session.starttime?.slice(0, 16)}
                      onChange={(e) => setEditForm((f) => ({ ...f, starttime: e.target.value }))}
                    />
                  </Field>
                  <Field label="End">
                    <input
                      type="datetime-local"
                      className={inputSmCls}
                      style={{ fontSize: "12px" }}
                      defaultValue={session.endtime?.slice(0, 16)}
                      onChange={(e) => setEditForm((f) => ({ ...f, endtime: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditId(null)}
                    className="flex-1 bg-muted text-foreground py-2 rounded-lg border border-border"
                    style={{ fontSize: "12px" }}>Cancel</button>
                  <button onClick={() => handleEdit(session.id)} disabled={saving}
                    className="flex-1 bg-primary text-white py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60"
                    style={{ fontSize: "12px", fontWeight: 600 }}>
                    {saving ? <Spinner /> : <Check size={13} />} Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-primary" style={{ fontSize: "14px", fontWeight: 700 }}>
                    {session.sessionnumber}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                    Session {session.sessionnumber}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    {fmtDate(session.starttime)}
                    {session.endtime ? ` – ${fmtDate(session.endtime)}` : ""}
                    {" · "}
                    {riderCount(session.id)} rider{riderCount(session.id) !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setEditId(session.id);
                      setEditForm({
                        sessionnumber: session.sessionnumber,
                        starttime: session.starttime,
                        endtime: session.endtime,
                      });
                    }}
                    className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                    <Edit2 size={12} className="text-primary" />
                  </button>
                  <button onClick={() => handleDelete(session.id)}
                    className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <Trash2 size={12} className="text-destructive" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
