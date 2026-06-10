import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Plus, FileText, ChevronRight, Edit } from "lucide-react";
import { getCurrentUser, canEditForms } from "../store/data";
import { useRider, useDailyForms, useFinalForms } from "../store/hooks";

export function RiderDetailPage() {
  const navigate = useNavigate();
  const { riderId } = useParams();
  const user = getCurrentUser()!;
  const canEdit = canEditForms(user);

  const id = riderId ? riderId : null;
  const { data: rider, loading: riderLoading } = useRider(id);
  const { data: dailyForms } = useDailyForms();
  const { data: finalForms } = useFinalForms();

  const riderForms = [
    ...(dailyForms ?? []).filter((f) => f.rider === id).map((f) => ({ ...f, formType: "daily" as const })),
    ...(finalForms ?? []).filter((f) => f.rider === id).map((f) => ({ ...f, formType: "final" as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (riderLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Rider not found</p>
      </div>
    );
  }

  const fullName = `${rider.firstname} ${rider.lastname}`;
  const totalForms = riderForms.length;
  // Highest level that has any form submitted
  const highestLevel = riderForms.length > 0 ? Math.max(...riderForms.map((f) => f.level)) : 0;

  const statusColor: Record<string, string> = {
    draft:     "bg-muted text-muted-foreground",
    submitted: "bg-accent/15 text-accent",
    approved:  "bg-secondary text-primary",
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-white" style={{ fontSize: "18px", fontWeight: 600 }}>Rider Profile</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
            <span className="text-white" style={{ fontSize: "26px", fontWeight: 700 }}>
              {rider.firstname.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="text-white" style={{ fontSize: "20px", fontWeight: 700 }}>{fullName}</h2>
            <p className="text-white/60" style={{ fontSize: "13px" }}>
              {rider.leader_name ? `Leader: ${rider.leader_name}` : "No leader assigned"}
              {rider.isquickstart ? " · Quickstart" : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Top Level", value: highestLevel || "—" },
            { label: "Total Forms", value: totalForms },
            { label: "Session", value: rider.session_number ?? "—" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white" style={{ fontSize: "20px", fontWeight: 700 }}>{s.value}</p>
              <p className="text-white/60" style={{ fontSize: "10px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-5">
        {canEdit && (
          <button onClick={() => navigate("/forms/new")}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl"
            style={{ fontSize: "14px", fontWeight: 600 }}>
            <Plus size={18} /> New Assessment for {rider.firstname}
          </button>
        )}

        <div>
          <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
            Assessment History
          </h2>

          {riderForms.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center gap-3">
              <FileText size={28} className="text-muted-foreground" />
              <p className="text-muted-foreground text-center" style={{ fontSize: "13px" }}>
                No assessments yet for this rider
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {riderForms.map((form) => {
                const skillCount = form.skill_links?.length ?? 0;
                // A skill_link is "completed" if it has a non-empty comments field
                // (the serializer has no boolean — use presence of comments as proxy,
                //  or just show the count directly)
                const formLabel = form.formType === "daily" ? "Daily" : "Final";
                const routeId = `${form.formType}-${form.id}`;

                return (
                  <div key={routeId} className="bg-card rounded-2xl border border-border overflow-hidden">
                    <button onClick={() => navigate(`/forms/${routeId}`)}
                      className="w-full flex items-center gap-3 px-4 py-4 text-left">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                            Level {form.level}{form.level >= 4 ? "+" : ""} {formLabel}
                          </p>
                        </div>
                        <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                          {new Date(form.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          {form.leader_name ? ` · ${form.leader_name}` : ""}
                        </p>
                        {skillCount > 0 && (
                          <p className="text-muted-foreground mt-1" style={{ fontSize: "11px" }}>
                            {skillCount} skill{skillCount !== 1 ? "s" : ""} recorded
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/forms/${routeId}/edit`); }}
                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                            <Edit size={12} className="text-muted-foreground" />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
