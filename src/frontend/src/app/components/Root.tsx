import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { Home, Upload, PlusSquare, Users, Settings } from "lucide-react";
import { getCurrentUser, setCurrentUser } from "../store/data";
import { auth } from "../store/firebase";
import { fetchMe, logout } from "../store/api";
import { onAuthStateChanged } from "firebase/auth";

export function Root() {
  const navigate = useNavigate();
  const location = useLocation();
  // Three states: "checking" (waiting on Firebase), "authed", "unauthed"
  const [authState, setAuthState] = useState<"checking" | "authed" | "unauthed">("checking");

  useEffect(() => {
    // onAuthStateChanged fires once on mount with the persisted session (or null),
    // so we never flash the login page on a page refresh if still signed in.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthState("unauthed");
        navigate("/login");
        return;
      }

      // Firebase has a user — fetch Django profile to get role etc.
      // (FirebaseAuthentication will auto-create the Account if first login)
      try {
        const me = await fetchMe();
        setCurrentUser({
          id: String(me.id),
          name: firebaseUser.displayName ?? me.email.split("@")[0],
          email: me.email,
          role: (me.role ?? "anonymous") as import("../store/data").UserRole,
        });
        setAuthState("authed");
      } catch {
        // Django rejected the token (e.g. service account not configured)
        await logout();
        setAuthState("unauthed");
        navigate("/login");
      }
    });

    return unsubscribe; // clean up listener on unmount
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Still waiting on Firebase to restore session — render nothing to avoid flash
  if (authState === "checking") return null;

  const user = getCurrentUser();
  if (!user) return null;

  const allNavItems = [
    { path: "/",             icon: Home,       label: "Home",    roles: ["superadmin", "leader", "caregiver"] },
    { path: "/upload",       icon: Upload,     label: "Upload",  roles: ["superadmin", "leader"] },
    { path: "/forms/new",    icon: PlusSquare, label: "New Form",roles: ["superadmin", "leader"] },
    { path: "/riders",       icon: Users,      label: "Riders",  roles: ["superadmin", "leader"] },
    { path: "/admin/overview",icon: Settings,  label: "Manage",  roles: ["superadmin"] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(user.role));

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path.startsWith("/admin")) return location.pathname.startsWith("/admin");
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-0 flex-1 ${
                isActive(path) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon
                size={22}
                className={isActive(path) ? "text-primary" : "text-muted-foreground"}
                strokeWidth={isActive(path) ? 2.5 : 1.8}
              />
              <span
                style={{ fontSize: "11px", fontWeight: isActive(path) ? 600 : 400 }}
                className="truncate"
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
