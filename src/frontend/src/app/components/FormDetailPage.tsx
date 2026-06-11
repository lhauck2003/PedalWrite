import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Edit, User, Calendar, Award, MessageSquare, FileText } from "lucide-react";
import { getCurrentUser, canEditForms } from "../store/data";
import { useDailyForm, useFinalForm, useRiders } from "../store/hooks";

const SKILL_LEVELS: Record<number, { label: string; color: string }> = {
  0: { label: "Intro",     color: "bg-muted text-muted-foreground" },
  1: { label: "Model",     color: "bg-blue-100 text-blue-700" },
  2: { label: "Support",   color: "bg-yellow-100 text-yellow-700" },
  3: { label: "Encourage", color: "bg-orange-100 text-orange-700" },
  4: { label: "Release",   color: "bg-secondary text-primary" },
};

export function FormDetailPage() {
  const navigate = useNavigate();
  const { formId } = useParams();
  const user = getCurrentUser()!;
  const canEdit = canEditForms(user);

  // formId convention: "daily-<uuid>" or "final-<uuid>"
  const formType = formId?.startsWith("final-") ? "final" : "daily";
  const uuid = formId ? formId.replace(/^(daily|final)-/, "") : null;

  const { data: dailyForm, loading: loadingDaily } = useDailyForm(
    formType === "daily" ? uuid : null
  );
  const { data: finalForm, loading: loadingFinal } = useFinalForm(
    formType === "final" ? uuid : null
  );
  const { data: riders } = useRiders();

  const form = dailyForm ?? finalForm ?? null;
  const loading = loadingDaily || loadingFinal;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Form not found</p>
      </div>
    );
  }

  const rider = riders?.find((r) => r.id === form.rider);
  const riderName = rider ? `${rider.firstname} ${rider.lastname}` : `Rider #${form.rider}`;
  const skillLinks = form.skill_links ?? [];

  // Group by SkillLevel (0–4), not form level
  const bySkillLevel = skillLinks.reduce<Record<number, typeof skillLinks>>((acc, sl) => {
    const lvl = sl.level ?? 0;
    if (!acc[lvl]) acc[lvl] = [];
    acc[lvl].push(sl);
    return acc;
  }, {});

  // Progress: sum of all skill levels / (count * 4)
  const progressPct = skillLinks.length > 0
    ? Math.round(
        (skillLinks.reduce((sum, sl) => sum + (sl.level ?? 0), 0) / (skillLinks.length * 4)) * 100
      )
    : 0;

  const withComments = skillLinks.filter((s) => s.comments?.trim()).length;

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-foreground" style={{ fontSize: "18px", fontWeight: 600 }}>
            {formType === "daily" ? "Daily" : "Final"} Assessment
          </h1>
        </div>
        <div className={`px-2.5 py-1 rounded-full mr-1 ${formType === "daily" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent"}`}
          style={{ fontSize: "11px", fontWeight: 600 }}>
          {formType === "daily" ? "Daily" : "Final"}
        </div>
        {canEdit && (
          <button onClick={() => navigate(`/forms/${formId}/edit`)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <Edit size={16} className="text-foreground" />
          </button>
        )}
      </div>

      <div className="flex-1 px-5 py-4 space-y-4">
        {/* Form metadata */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {[
            { icon: User,     label: "Rider",   value: riderName },
            { icon: User,     label: "Leader",  value: form.leader_name ?? "—" },
            { icon: Award,    label: "Skill Level", value: `Level ${form.level}` },
            { icon: Calendar, label: "Date",    value: new Date(form.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) },
            { icon: FileText, label: "Session", value: form.session_number ? `Session ${form.session_number}` : "—" },
          ].map(({ icon: Icon, label, value }, i, arr) => (
            <div key={label}
              className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Icon size={13} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>{label}</p>
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* General comments */}
        {form.comments?.trim() && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-muted-foreground mb-1"
              style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              General Comments
            </p>
            <p className="text-foreground" style={{ fontSize: "13px", lineHeight: "1.5" }}>{form.comments}</p>
          </div>
        )}

        {/* Progress */}
        {skillLinks.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>Skills Progress</p>
              <p className="text-primary" style={{ fontSize: "13px", fontWeight: 700 }}>
                {progressPct}%
              </p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>Intro</span>
              <span className="text-muted-foreground" style={{ fontSize: "10px" }}>Release</span>
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {Object.entries(SKILL_LEVELS).map(([val, { label, color }]) => {
                const count = (bySkillLevel[Number(val)] ?? []).length;
                if (count === 0) return null;
                return (
                  <span key={val} className={`px-2 py-0.5 rounded-full ${color}`}
                    style={{ fontSize: "10px", fontWeight: 600 }}>
                    {label}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Skills list grouped by SkillLevel */}
        {skillLinks.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>
              Skills ({skillLinks.length})
            </h2>
            {Object.entries(bySkillLevel)
              .sort(([a], [b]) => Number(b) - Number(a)) // highest level first
              .map(([levelStr, skills]) => {
                const levelNum = Number(levelStr);
                const { label, color } = SKILL_LEVELS[levelNum] ?? SKILL_LEVELS[0];
                return (
                  <div key={levelStr}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full ${color}`}
                        style={{ fontSize: "10px", fontWeight: 700 }}>
                        {label}
                      </span>
                      <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                        {skills.length} skill{skills.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="bg-card rounded-2xl border border-border overflow-hidden">
                      {skills.map((sl, i) => (
                        <div key={sl.id}
                          className={`px-4 py-3 ${i < skills.length - 1 ? "border-b border-border" : ""}`}>
                          <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>
                            {sl.skill_name}
                          </p>
                          {sl.comments?.trim() && (
                            <div className="flex items-start gap-1.5 mt-1.5">
                              <MessageSquare size={11} className="text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                                {sl.comments}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center gap-3">
            <FileText size={28} className="text-muted-foreground" />
            <p className="text-muted-foreground text-center" style={{ fontSize: "13px" }}>
              No skills recorded on this form yet
            </p>
            {canEdit && (
              <button onClick={() => navigate(`/forms/${formId}/edit`)}
                className="px-4 py-2 bg-primary text-white rounded-xl"
                style={{ fontSize: "13px", fontWeight: 600 }}>
                Add Skills
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
