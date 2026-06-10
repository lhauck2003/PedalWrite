import { useNavigate } from "react-router";
import {
  LogOut, Bike, Users, UserCheck, Shield, BookOpen, BarChart2, ChevronRight, Calendar,
} from "lucide-react";
import { getCurrentUser, setCurrentUser } from "../store/data";
import { logout } from "../store/api";
import { useGeneralStats, useBikes, useBikeSpecs } from "../store/hooks";

export function AdminDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser()!;

  const { data: stats } = useGeneralStats();
  const { data: bikes } = useBikes();
  const { data: bikeSpecs } = useBikeSpecs();

  const statItems = [
    { label: "Riders", value: stats?.riders ?? "—" },
    { label: "Sessions", value: stats?.sessions ?? "—" },
    { label: "Daily Forms", value: stats?.daily_forms ?? "—" },
    { label: "Final Forms", value: stats?.final_forms ?? "—" },
    { label: "Bikes", value: bikes?.length ?? "—" },
    { label: "Bike Specs", value: bikeSpecs?.length ?? "—" },
  ];

  const sections = [
    {
      title: "Manage Skills",
      desc: "Add, edit, or remove assessment skills by level",
      icon: BookOpen,
      color: "bg-primary/10 text-primary",
      path: "/admin/skills",
    },
    {
      title: "Manage Riders",
      desc: "Update rider profiles and caregiver assignments",
      icon: Users,
      color: "bg-secondary text-primary",
      path: "/admin/riders",
    },
    {
      title: "Manage Caregivers",
      desc: "Invite caregivers and manage their accounts",
      icon: UserCheck,
      color: "bg-accent/15 text-accent",
      path: "/admin/caregivers",
    },
    {
      title: "Manage Leaders",
      desc: "Invite leaders and manage their accounts",
      icon: Shield,
      color: "bg-muted text-muted-foreground",
      path: "/admin/leaders",
    },
    {
      title: "Bike Inventory",
      desc: "Add, update, or remove bikes from the fleet",
      icon: Bike,
      color: "bg-accent/15 text-accent",
      path: "/admin/bikes",
    },
    {
      title: "View Totals",
      desc: "Account-level overview of riders, forms, and activity",
      icon: BarChart2,
      color: "bg-secondary text-primary",
      path: "/admin/overview",
    },
    {
      title: "Manage Sessions",
      desc: "Create and schedule program sessions",
      icon: Calendar,
      color: "bg-primary/10 text-primary",
      path: "/admin/sessions",
    },
  ];

  const bikeStatusColor: Record<string, string> = {
    available: "text-primary",
    "in-use": "text-accent",
    maintenance: "text-destructive",
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-white/60" style={{ fontSize: "12px" }}>Admin Panel</p>
            <h1 className="text-white" style={{ fontSize: "22px", fontWeight: 700 }}>
              Bike First!
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full text-white/80 border border-white/20"
              style={{ fontSize: "11px", fontWeight: 500 }}>
              Admin
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

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {statItems.map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-white" style={{ fontSize: "20px", fontWeight: 700 }}>{s.value}</p>
              <p className="text-white/60" style={{ fontSize: "10px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 py-5 space-y-5">
        {/* Management sections */}
        <div>
          <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
            Management
          </h2>
          <div className="space-y-2">
            {sections.map(({ title, desc, icon: Icon, color, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 bg-card p-4 rounded-2xl border border-border hover:border-primary/20 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>{title}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "11px" }}>{desc}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Bike inventory quick view */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>Bike Fleet</h2>
            <button className="text-primary" style={{ fontSize: "13px" }} onClick={() => navigate("/admin/bikes")}>
              Manage
            </button>
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {bikes && bikes.length > 0 ? (
              bikes.slice(0, 4).map((bike, i) => {
                // Find specs for this bike (first match)
                const spec = bikeSpecs?.find((s) => s.bike === bike.id);
                return (
                  <div
                    key={bike.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(bikes.length, 4) - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Bike size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>
                        {bike.name}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                  {bikes === null ? "Loading bikes…" : "No bikes in fleet yet"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
