import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Check, ChevronDown, ChevronUp, FileText, ClipboardList } from "lucide-react";
import { getCurrentUser } from "../store/data";
import { useRiders, useSkills, useDailyForm, useFinalForm, useSessions } from "../store/hooks";
import {
  createDailyForm,
  updateDailyForm,
  createFinalForm,
  updateFinalForm,
  ApiSkill,
  ApiDailyFormSkillInput,
  ApiFinalFormSkillInput,
} from "../store/api";

// ─── SkillLevel matches models.SkillLevel ─────────────────────────────────────
const SKILL_LEVELS = [
  { value: 0, label: "Intro",    short: "I",  color: "bg-muted text-muted-foreground" },
  { value: 1, label: "Model",    short: "M",  color: "bg-blue-100 text-blue-700" },
  { value: 2, label: "Support",  short: "S",  color: "bg-yellow-100 text-yellow-700" },
  { value: 3, label: "Encourage",short: "E",  color: "bg-orange-100 text-orange-700" },
  { value: 4, label: "Release",  short: "R",  color: "bg-secondary text-primary" },
] as const;

type SkillLevelValue = 0 | 1 | 2 | 3 | 4;

interface SkillEntry {
  skillId: string;
  level: SkillLevelValue;
  comments: string;
}

// ─── Route: /forms/new  or  /forms/:formId/edit ───────────────────────────────
export function FillFormPage() {
  const navigate = useNavigate();
  const { formId } = useParams();
  const user = getCurrentUser()!;

  const isEdit = Boolean(formId);

  // Step 1 when creating: choose Daily or Final
  // formType is set by the user if creating, or derived from route convention when editing.
  // Route convention: /forms/daily-<uuid>/edit  or  /forms/final-<uuid>/edit
  const [formType, setFormType] = useState<"daily" | "final" | null>(
    isEdit ? (formId?.startsWith("final-") ? "final" : "daily") : null
  );

  const editId = formId
    ? formId.replace(/^(daily|final)-/, "")
    : null;

  // Load existing form when editing
  const { data: existingDaily } = useDailyForm(
    formType === "daily" && editId ? editId : null
  );
  const { data: existingFinal } = useFinalForm(
    formType === "final" && editId ? editId : null
  );
  const existingForm = existingDaily ?? existingFinal ?? null;

  // Load riders, sessions, skills
  const { data: riders, loading: ridersLoading } = useRiders();
  const { data: sessions } = useSessions();
  const [selectedLevel, setSelectedLevel] = useState<number>(existingForm?.level ?? 1);
  const { data: apiSkills } = useSkills(selectedLevel);

  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(
    existingForm?.rider ?? null
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    existingForm?.session ?? null
  );
  const [comments, setComments] = useState<string>(existingForm?.comments ?? "");

  // Per-skill state: level (SkillLevel) + optional comments
  const [skillEntries, setSkillEntries] = useState<Record<string, SkillEntry>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate skill entries when skills load or existing form changes
  useEffect(() => {
    if (!apiSkills) return;
    const initial: Record<string, SkillEntry> = {};
    for (const s of apiSkills) {
      const existing = existingForm?.skill_links?.find(
        (sl: ApiDailyFormSkillInput | ApiFinalFormSkillInput) => sl.skill === s.id
      );
      initial[s.id] = {
        skillId: s.id,
        level: (existing?.level ?? 1) as SkillLevelValue,
        comments: existing?.comments ?? "",
      };
    }
    setSkillEntries(initial);
    // Expand all categories by default
    setExpandedCategories(new Set(apiSkills.map((s) => s.category ?? "General")));
  }, [apiSkills]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSkillLevel = (skillId: string, level: SkillLevelValue) => {
    setSkillEntries((prev) => ({
      ...prev,
      [skillId]: { ...prev[skillId], skillId, level },
    }));
  };

  const setSkillComments = (skillId: string, value: string) => {
    setSkillEntries((prev) => ({
      ...prev,
      [skillId]: { ...prev[skillId], skillId, comments: value },
    }));
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Group skills by category
  const categoriesMap = (apiSkills ?? []).reduce<Record<string, ApiSkill[]>>(
    (acc, skill) => {
      const cat = skill.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    },
    {}
  );

  // Count skills at Release (4) for progress indicator
  const releasedCount = Object.values(skillEntries).filter((e) => e.level === 4).length;
  const totalCount = apiSkills?.length ?? 0;

  const handleSave = async () => {
    if (!selectedRiderId) { setError("Please select a rider."); return; }
    if (!formType) { setError("Please select a form type."); return; }
    setSaving(true);
    setError(null);

    // Build nested skill_links — serializer creates them in one shot
    const skill_links = (apiSkills ?? []).map((skill) => {
      const entry = skillEntries[skill.id];
      return {
        skill: skill.id,
        level: entry?.level ?? 0,
        comments: entry?.comments ?? "",
      };
    });

    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      rider: selectedRiderId,
      session: selectedSessionId,
      level: selectedLevel,
      date: today,
      comments: comments || "",
      skill_links,
    };

    try {
      if (isEdit && editId) {
        if (formType === "daily") {
          await updateDailyForm(editId, payload);
        } else {
          await updateFinalForm(editId, payload);
        }
      } else {
        if (formType === "daily") {
          await createDailyForm(payload);
        } else {
          await createFinalForm(payload);
        }
      }
      setSaved(true);
      setTimeout(() => navigate("/"), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save form.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Success screen ───────────────────────────────────────────────────────

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-4 px-8">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <Check size={28} className="text-primary" strokeWidth={2.5} />
        </div>
        <p className="text-foreground" style={{ fontSize: "18px", fontWeight: 600 }}>
          Form saved!
        </p>
      </div>
    );
  }

  // ─── Step 1: choose form type (create only) ───────────────────────────────

  if (!formType) {
    return (
      <div className="flex flex-col min-h-full bg-background">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4 bg-card border-b border-border">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <h1 className="text-foreground" style={{ fontSize: "18px", fontWeight: 600 }}>
            New Assessment
          </h1>
        </div>
        <div className="flex-1 px-5 py-8 space-y-4">
          <p className="text-muted-foreground text-center" style={{ fontSize: "14px" }}>
            What type of assessment form?
          </p>
          <button
            onClick={() => setFormType("daily")}
            className="w-full flex items-center gap-4 bg-card p-5 rounded-2xl border-2 border-border hover:border-primary/30 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>Daily Form</p>
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                Used during regular sessions to record skill progress
              </p>
            </div>
          </button>
          <button
            onClick={() => setFormType("final")}
            className="w-full flex items-center gap-4 bg-card p-5 rounded-2xl border-2 border-border hover:border-primary/30 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-accent" />
            </div>
            <div>
              <p className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>Final Form</p>
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                End-of-session summative assessment
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 bg-card border-b border-border">
        <button
          onClick={() => isEdit ? navigate(-1) : setFormType(null)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-foreground" style={{ fontSize: "18px", fontWeight: 600 }}>
            {isEdit ? "Edit" : "New"} {formType === "daily" ? "Daily" : "Final"} Form
          </h1>
        </div>
        <div className={`px-2.5 py-1 rounded-full ${formType === "daily" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent"}`}
          style={{ fontSize: "11px", fontWeight: 600 }}>
          {formType === "daily" ? "Daily" : "Final"}
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-5">

        {/* Form metadata */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Rider */}
          <div className="px-4 py-3 border-b border-border">
            <label className="text-muted-foreground block mb-1"
              style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Rider
            </label>
            {ridersLoading ? (
              <p className="text-muted-foreground" style={{ fontSize: "14px" }}>Loading riders…</p>
            ) : (
              <select
                className="w-full bg-transparent text-foreground outline-none"
                style={{ fontSize: "15px" }}
                value={selectedRiderId ?? ""}
                onChange={(e) => setSelectedRiderId(e.target.value || null)}
              >
                <option value="">Select a rider…</option>
                {(riders ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.firstname} {r.lastname}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Session */}
          <div className="px-4 py-3 border-b border-border">
            <label className="text-muted-foreground block mb-1"
              style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Session
            </label>
            <select
              className="w-full bg-transparent text-foreground outline-none"
              style={{ fontSize: "15px" }}
              value={selectedSessionId ?? ""}
              onChange={(e) => setSelectedSessionId(e.target.value || null)}
            >
              <option value="">No session</option>
              {(sessions ?? []).map((s) => (
                <option key={s.id} value={s.id}>Session {s.sessionnumber}</option>
              ))}
            </select>
          </div>

          {/* Leader (read-only) */}
          <div className="px-4 py-3 border-b border-border">
            <label className="text-muted-foreground block mb-1"
              style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Leader
            </label>
            <p className="text-foreground" style={{ fontSize: "15px" }}>{user.name}</p>
          </div>

          {/* Level */}
          <div className="px-4 py-3">
            <label className="text-muted-foreground block mb-2"
              style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Skill Level
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((l) => (
                <button
                  key={l}
                  onClick={() => setSelectedLevel(l)}
                  className={`flex-1 py-2.5 rounded-xl border transition-colors ${
                    selectedLevel === l
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-foreground border-border"
                  }`}
                  style={{ fontSize: "14px", fontWeight: 600 }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress */}
        {totalCount > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                Skills Progress
              </p>
              <p className="text-primary" style={{ fontSize: "13px", fontWeight: 700 }}>
                {releasedCount}/{totalCount} Released
              </p>
            </div>
            {/* Single bar showing weighted progress — each level counts as level/4 of full */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${
                    totalCount > 0
                      ? (Object.values(skillEntries).reduce((sum, e) => sum + e.level, 0) /
                          (totalCount * 4)) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>Intro</span>
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>Release</span>
            </div>
          </div>
        )}

        {/* Skills by category */}
        <div className="space-y-2">
          <h2 className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>
            Skills — Level {selectedLevel}
          </h2>

          {totalCount === 0 && (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                {apiSkills === null ? "Loading skills…" : "No skills defined for this level yet."}
              </p>
            </div>
          )}

          {Object.entries(categoriesMap).map(([category, catSkills]) => {
            const isExpanded = expandedCategories.has(category);
            const catReleased = catSkills.filter(
              (s) => (skillEntries[s.id]?.level ?? 0) === 4
            ).length;

            return (
              <div key={category} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex-1 flex items-center gap-2">
                    <p className="text-foreground text-left" style={{ fontSize: "14px", fontWeight: 600 }}>
                      {category}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        catReleased === catSkills.length && catSkills.length > 0
                          ? "bg-secondary text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                      style={{ fontSize: "10px", fontWeight: 700 }}
                    >
                      {catReleased}/{catSkills.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {catSkills.map((skill, i) => {
                      const entry = skillEntries[skill.id] ?? { level: 0, comments: "" };
                      const currentLevel = entry.level as SkillLevelValue;

                      return (
                        <div
                          key={skill.id}
                          className={`px-4 py-3 ${i < catSkills.length - 1 ? "border-b border-border" : ""}`}
                        >
                          {/* Skill name */}
                          <p className="text-foreground mb-2" style={{ fontSize: "13px", fontWeight: 500 }}>
                            {skill.skillname}
                          </p>

                          {/* Level selector — 5 buttons matching SkillLevel choices */}
                          <div className="flex gap-1 mb-2">
                            {SKILL_LEVELS.map(({ value, label, short }) => (
                              <button
                                key={value}
                                onClick={() => setSkillLevel(skill.id, value)}
                                className={`flex-1 py-1.5 rounded-lg border transition-colors text-center ${
                                  currentLevel === value
                                    ? "bg-primary text-white border-primary"
                                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                                }`}
                                title={label}
                                style={{ fontSize: "10px", fontWeight: 600 }}
                              >
                                {short}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between mb-1.5">
                            {SKILL_LEVELS.map(({ value, label }) => (
                              <span
                                key={value}
                                className={`flex-1 text-center ${currentLevel === value ? "text-primary" : "text-muted-foreground"}`}
                                style={{ fontSize: "9px" }}
                              >
                                {value === currentLevel ? label : ""}
                              </span>
                            ))}
                          </div>

                          {/* Comments field — shown when level > 0 */}
                          {currentLevel > 0 && (
                            <input
                              className="w-full bg-muted/30 rounded-lg border border-border px-2.5 py-1.5 text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                              style={{ fontSize: "12px" }}
                              placeholder="Comments (optional)"
                              value={entry.comments}
                              onChange={(e) => setSkillComments(skill.id, e.target.value)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Form-level comments */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <label className="text-muted-foreground block mb-2"
            style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            General Comments
          </label>
          <textarea
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground resize-none"
            style={{ fontSize: "14px", minHeight: "80px" }}
            placeholder="Overall observations for this session…"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-red-500 text-center" style={{ fontSize: "13px" }}>{error}</p>
        )}

        {/* Submit */}
        <div className="pb-4">
          <button
            onClick={handleSave}
            disabled={saving || !selectedRiderId}
            className="w-full bg-primary text-white py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontSize: "15px", fontWeight: 600 }}
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? "Saving…" : `Submit ${formType === "daily" ? "Daily" : "Final"} Form`}
          </button>
        </div>
      </div>
    </div>
  );
}
