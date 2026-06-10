import { getCurrentUser } from "../store/data";
import { AdminDashboard } from "./AdminDashboard";
import { LeaderDashboard } from "./LeaderDashboard";
import { CaregiverDashboard } from "./CaregiverDashboard";
import AnonymousDashboard from "./AnonymousDashboard";

export function DashboardPage() {
  const user = getCurrentUser();
  if (!user) return null;

  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "leader") return <LeaderDashboard />;
  if (user.role === "caregiver") return <CaregiverDashboard />;
  if (user.role === "anonymous") return <AnonymousDashboard />; 
}
