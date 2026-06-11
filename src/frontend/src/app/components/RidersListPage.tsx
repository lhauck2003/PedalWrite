import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronUp, ChevronRight, FileText, Search, Plus } from "lucide-react";
import { getCurrentUser } from "../store/data";
import { useRiders, useDailyForms, useFinalForms } from "../store/hooks";

export function RidersListPage() {
  const navigate = useNavigate();
  const user = getCurrentUser()!;
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: riders, loading: ridersLoading } = useRiders();
  const { data: dailyForms } = useDailyForms();
  const { data: finalForms } = useFinalForms();

  if (user.role === "caregiver") {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-8 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <FileText size={24} className="text-muted-foreground" />
        </div>
        <p className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>
          Access Restricted
        </p>
        <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
          Only leaders and admins can view the full riders directory.
        </p>
      </div>
    );
  }

  const filteredRiders = (riders ?? []).filter((r) =>
    r.firstname?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (riderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(riderId) ? next.delete(riderId) : next.add(riderId);
      return next;
    });
  };

  const levelColors = ["", "bg-muted text-muted-foreground", "bg-accent/15 text-accent", "bg-secondary text-primary", "bg-primary/10 text-primary"];

  const statusColor: Record<string, string> = {
    draft: "text-muted-foreground",
    submitted: "text-accent",
    approved: "text-primary",
  };

  // Combine daily and final forms for a rider
  const formsForRider = (riderId: string) => {
    const df = (dailyForms ?? []).filter((f) => f.rider === riderId).map((f) => ({
      id: `daily-${f.id}`,
      numId: f.id,
      formType: "daily",
      level: f.level,
      date: f.date,
      skillCount: f.skill_links?.length ?? 0,
    }));
    const ff = (finalForms ?? []).filter((f) => f.rider === riderId).map((f) => ({
      id: `final-${f.id}`,
      numId: f.id,
      formType: "final",
      level: f.level,
      date: f.date,
      skillCount: f.skill_links?.length ?? 0,
    }));
    return [...df, ...ff].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white" style={{ fontSize: "22px", fontWeight: 700 }}>
            Riders
          </h1>
          <button
            onClick={() => navigate("/forms/new")}
            className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
          <Search size={16} className="text-white/60" />
          <input
            className="flex-1 bg-transparent text-white placeholder:text-white/50 outline-none"
            style={{ fontSize: "14px" }}
            placeholder="Search riders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-2">
        {ridersLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
              {filteredRiders.length} rider{filteredRiders.length !== 1 ? "s" : ""}
            </p>

            {filteredRiders.map((rider) => {
              const riderForms = formsForRider(rider.id);
              const isOpen = expanded.has(rider.id);

              return (
                <div key={rider.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <button
                    onClick={() => toggleExpand(rider.id)}
                    className="w-full flex items-center gap-3 px-4 py-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                      <span className="text-white" style={{ fontSize: "15px", fontWeight: 700 }}>
                        {(rider.lastname ?? "?").charAt(0)}
                      </span>
                    </div>
                    {rider?.firstname} {rider?.lastname}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border">
                      {riderForms.length === 0 ? (
                        <div className="px-4 py-4 flex items-center gap-3">
                          <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                            No forms yet
                          </p>
                          <button
                            onClick={() => navigate("/forms/new")}
                            className="ml-auto text-primary"
                            style={{ fontSize: "12px", fontWeight: 600 }}
                          >
                            + Add
                          </button>
                        </div>
                      ) : (
                        <>
                          {riderForms.map((form, i) => (
                            <button
                              key={form.id}
                              onClick={() => navigate(`/forms/${form.id}`)}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left ${
                                i < riderForms.length - 1 ? "border-b border-border" : ""
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <FileText size={14} className="text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>
                                  Level {form.level} {form.formType === "daily" ? "Daily" : "Final"} Assessment
                                </p>
                              </div>
                            </button>
                          ))}
                          <button
                            onClick={() => navigate(`/riders/${rider.id}`)}
                            className="w-full px-4 py-3 border-t border-border text-primary flex items-center justify-center gap-1"
                            style={{ fontSize: "12px", fontWeight: 600 }}
                          >
                            View full profile
                            <ChevronRight size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
