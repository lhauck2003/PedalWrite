import { useNavigate } from "react-router";
import { Upload, PlusSquare, Users, FileText, ChevronRight, LogOut, BarChart2 } from "lucide-react";
import { getCurrentUser, setCurrentUser } from "../store/data";
import { logout, fetchMe, ApiLeader, fetchLeader, updateLeader } from "../store/api";
import { useRiders, useDailyForms, useFinalForms } from "../store/hooks";
import { useEffect, useState } from "react";

export function LeaderDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser()!;
  if(!user) {
    navigate("/login");
    return null;
  }
  const { data: riders } = useRiders();
  const { data: dailyForms } = useDailyForms();
  const { data: finalForms } = useFinalForms();

  // All forms together (daily + final) for display
  const allForms = [
    ...(dailyForms ?? []).map((f) => ({ ...f, formType: "daily" as const })),
    ...(finalForms ?? []).map((f) => ({ ...f, formType: "final" as const })),
  ];

  const [leader, setLeader] = useState<ApiLeader | null>(null);
  const [loadingLeader, setLoadingLeader] = useState(true);

  useEffect(() => {
    const loadCaregiver = async () => {
      try {
        const me = await fetchMe();

        if (!me.leader) {
          console.error("No leader linked to account");
          return;
        }

        const leaderData = await fetchLeader(me.leader);
        setLeader(leaderData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLeader(false);
      }
    };

    loadCaregiver();
  }, []);

  const [savingProfile, setSavingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstname: leader?.firstname ?? user?.name,
    lastname: leader?.lastname ?? "",
    email: leader?.email ?? user?.email,
  });

  useEffect(() => {
    if (leader) {
      setProfileForm({
        firstname: leader.firstname,
        lastname: leader.lastname,
        email: user?.email,
      });
    }
  }, [leader]);
  const handleProfileSave = async () => {
      if (!leader) return;
  
      setSavingProfile(true);
  
      try {
        const updated = await updateLeader(leader.id, profileForm);
        setLeader(updated);
      } catch (err) {
        console.error(err);
        alert("Failed to update leader profile");
      } finally {
        setSavingProfile(false);
      }
    };

  const riderCount = riders?.length ?? "—";
  const formCount = allForms.length || "—";

  // 3 most recent forms by date
  const recentForms = [...allForms]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-accent/15 text-accent",
    approved: "bg-secondary text-primary",
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-primary px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60" style={{ fontSize: "13px" }}>Welcome back</p>
            <h1 className="text-white" style={{ fontSize: "22px", fontWeight: 700 }}>
              {user.name.split(" ")[0]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full text-white/80 border border-white/20" style={{ fontSize: "11px", fontWeight: 500 }}>
              Leader
            </div>
            {/* Analytics link — add this */}
            <button
              onClick={() => navigate("/analytics")}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              title="Program Analytics"
            >
              <BarChart2 size={15} className="text-white" />
            </button>
            <button
              onClick={() => { setCurrentUser(null); logout(); navigate("/login"); }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
            >
              <LogOut size={15} className="text-white" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "My Riders", value: riderCount },
            { label: "Forms", value: formCount },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white" style={{ fontSize: "22px", fontWeight: 700 }}>{stat.value}</p>
              <p className="text-white/60" style={{ fontSize: "11px" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
            {/* My Information */}
      <div>
        <h2
          className="text-foreground mb-3"
          style={{ fontSize: "15px", fontWeight: 600 }}
        >
          My Information
        </h2>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                className="text-muted-foreground block mb-1"
                style={{ fontSize: "11px" }}
              >
                First Name
              </label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={profileForm.firstname}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    firstname: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label
                className="text-muted-foreground block mb-1"
                style={{ fontSize: "11px" }}
              >
                Last Name
              </label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={profileForm.lastname}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    lastname: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div>
            <label
              className="text-muted-foreground block mb-1"
              style={{ fontSize: "11px" }}
            >
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={profileForm.email}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  email: e.target.value,
                }))
              }
            />
          </div>
          <button
            onClick={handleProfileSave}
            disabled={savingProfile}
            className="w-full bg-primary text-white py-2.5 rounded-xl disabled:opacity-60"
            style={{ fontSize: "13px", fontWeight: 600 }}
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
      <div className="flex-1 px-5 pt-5 pb-4 space-y-5">
        <div>
          <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/upload")}
              className="flex flex-col items-start gap-2 bg-card p-4 rounded-2xl border border-border hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                <Upload size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>Upload Form</p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>Scan a paper form</p>
              </div>
            </button>
            <button onClick={() => navigate("/forms/new")}
              className="flex flex-col items-start gap-2 bg-card p-4 rounded-2xl border border-border hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <PlusSquare size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>New Form</p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>Fill out digitally</p>
              </div>
            </button>
            <button onClick={() => navigate("/riders")}
              className="col-span-2 flex flex-col items-start gap-2 bg-card p-4 rounded-2xl border border-border hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>Riders Directory</p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  View and manage all {riderCount} riders
                </p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>Recent forms</h2>
            <button className="text-primary" style={{ fontSize: "13px" }} onClick={() => navigate("/riders")}>See all</button>
          </div>
          {recentForms.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                {dailyForms === null ? "Loading…" : "No forms yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentForms.map((form) => {
                const rider = riders?.find((r) => r.id === form.rider);

                return (
                  <button
                    key={form.id}
                    onClick={() => navigate(`/forms/${form.id}`)}
                    className="w-full flex items-center gap-3 bg-card p-4 rounded-2xl border border-border hover:border-primary/20 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-foreground truncate"
                        style={{ fontSize: "13px", fontWeight: 600 }}
                      >
                        {rider
                          ? `${rider.firstname} ${rider.lastname}`
                          : `Rider #${form.rider}`}{" "}
                        — Level {form.level}
                      </p>

                      <p
                        className="text-muted-foreground"
                        style={{ fontSize: "11px" }}
                      >
                        {new Date(form.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" · "}
                        {form.formType === "daily" ? "Daily" : "Final"} form
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
