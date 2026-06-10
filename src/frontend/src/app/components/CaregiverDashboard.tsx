import { useNavigate } from "react-router";
import { FileText, ChevronRight, LogOut, Award, BarChart2 } from "lucide-react";
import { getCurrentUser, setCurrentUser } from "../store/data";
import { logout, fetchMe, updateCaregiver, ApiCaregiver, fetchCaregiver } from "../store/api";
import { useRiders, useDailyForms, useFinalForms, useCaregivers } from "../store/hooks";
import { useEffect, useState } from "react";

export function CaregiverDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser()!;
  if(!user) {
    navigate("/login");
    return null;
  }
  const { data: caregivers } = useCaregivers();
  const { data: riders } = useRiders();
  const { data: dailyForms } = useDailyForms();
  const { data: finalForms } = useFinalForms();

  const [caregiver, setCaregiver] = useState<ApiCaregiver | null>(null);
  const [loadingCaregiver, setLoadingCaregiver] = useState(true);

  useEffect(() => {
    const loadCaregiver = async () => {
      try {
        const me = await fetchMe();

        if (!me.caregiver) {
          console.error("No caregiver linked to account");
          return;
        }

        const caregiverData = await fetchCaregiver(me.caregiver);
        setCaregiver(caregiverData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCaregiver(false);
      }
    };

    loadCaregiver();
  }, []);

  const [savingProfile, setSavingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstname: caregiver?.firstname ?? user?.name,
    lastname: caregiver?.lastname ?? "",
    email: caregiver?.email ?? user?.email,
    phone: caregiver?.phone ?? "",
    isemergencycontact: caregiver?.isemergencycontact ?? false,
  });

  useEffect(() => {
    if (caregiver) {
      setProfileForm({
        firstname: caregiver.firstname,
        lastname: caregiver.lastname,
        email: user?.email,
        phone: caregiver.phone ?? "",
        isemergencycontact: caregiver.isemergencycontact ?? false,
      });
    }
  }, [caregiver]);

  const handleProfileSave = async () => {
    if (!caregiver) return;

    setSavingProfile(true);

    try {
      const updated = await updateCaregiver(caregiver.id, profileForm);
      setCaregiver(updated);
    } catch (err) {
      console.error(err);
      alert("Failed to update caregiver profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const myRiders = riders ?? [];

  const allForms = [
    ...(dailyForms ?? []).map((f) => ({
      ...f,
      formType: "daily" as const,
    })),
    ...(finalForms ?? []).map((f) => ({
      ...f,
      formType: "final" as const,
    })),
  ].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-accent/15 text-accent",
    approved: "bg-secondary text-primary",
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60" style={{ fontSize: "13px" }}>Welcome back</p>
            <h1 className="text-white" style={{ fontSize: "22px", fontWeight: 700 }}>
              {user.name.split(" ")[0]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full text-white/80 border border-white/20"
              style={{ fontSize: "11px", fontWeight: 500 }}>
              Caregiver
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
            { label: "Riders", value: myRiders.length },
            { label: "Total Forms", value: allForms.length },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white" style={{ fontSize: "22px", fontWeight: 700 }}>{s.value}</p>
              <p className="text-white/60" style={{ fontSize: "11px" }}>{s.label}</p>
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
          <div>
            <label
              className="text-muted-foreground block mb-1"
              style={{ fontSize: "11px" }}
            >
              Phone
            </label>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  phone: e.target.value,
                }))
              }
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={profileForm.isemergencycontact}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  isemergencycontact: e.target.checked,
                }))
              }
            />
            <span style={{ fontSize: "13px" }}>
              Emergency Contact
            </span>
          </label>
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

      <div className="flex-1 px-5 py-5 space-y-5">
        {/* My Riders */}
        <div>
          <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>My Riders</h2>
          {myRiders.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                {riders === null ? "Loading…" : "No riders assigned yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {myRiders.map((rider) => {
                const riderForms = allForms.filter((f) => f.rider === rider.id);
                const latestForm = riderForms[0];
                return (
                  <div key={rider.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0">
                      <span className="text-white" style={{ fontSize: "17px", fontWeight: 700 }}>
                        {`${rider.firstname} ${rider.lastname}`.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                        {`${rider.firstname} ${rider.lastname}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Assessments (view only) */}
        <div>
          <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>Recent Assessments</h2>
          {allForms.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-2">
              <FileText size={24} className="text-muted-foreground" />
              <p className="text-muted-foreground text-center" style={{ fontSize: "13px" }}>
                {dailyForms === null ? "Loading…" : "No assessments yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {allForms.slice(0, 4).map((form) => {
                const total = form.skill_links?.length ?? 0;
                const riderObj = myRiders.find(
                    (r) => r.id === form.rider
                  );

                const riderName = riderObj
                    ? `${riderObj.firstname} ${riderObj.lastname}`
                    : `Rider #${form.rider}`;
                return (
                  <button
                    key={`${form.formType}-${form.id}`}
                    onClick={() => navigate(`/forms/${form.formType}-${form.id}`)}
                    className="w-full flex items-center gap-3 bg-card p-4 rounded-2xl border border-border hover:border-primary/20 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate" style={{ fontSize: "13px", fontWeight: 600 }}>
                        {riderName} — Level {form.level}
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
