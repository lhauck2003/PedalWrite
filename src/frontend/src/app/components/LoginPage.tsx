import { useState } from "react";
import { useNavigate } from "react-router";
import { loginWithGoogle } from "../store/api";
import { setCurrentUser } from "../store/data";

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await loginWithGoogle();
      setCurrentUser({
        id: String(me.id),
        name: me.email.split("@")[0],
        email: me.email,
        role: me.role ?? "leader",
      });
      navigate("/");
    } catch (err: unknown) {
      // "auth/popup-closed-by-user" is not a real error — user just dismissed it
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setLoading(false);
        return;
      }
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-primary">
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-8">

        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center">
            <svg width="46" height="32" viewBox="0 0 46 32" fill="none">
              <circle cx="8" cy="24" r="7" stroke="white" strokeWidth="2.5"/>
              <circle cx="38" cy="24" r="7" stroke="white" strokeWidth="2.5"/>
              <path d="M15 24L23 8L31 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 24L23 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M23 8L38 24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="23" cy="8" r="2.5" fill="white"/>
              <path d="M19 8h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-white" style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Bike First!
            </h1>
            <p className="text-white/65 mt-1" style={{ fontSize: "14px" }}>
              Rider skill assessment platform
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-foreground mb-1" style={{ fontSize: "17px", fontWeight: 700 }}>
            Welcome
          </h2>
          <p className="text-muted-foreground mb-6" style={{ fontSize: "13px" }}>
            Sign in with your Google account to continue
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-border bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#374151" }}>
              {loading ? "Signing in…" : "Continue with Google"}
            </span>
          </button>

          {error && (
            <p className="mt-4 text-red-500 text-center" style={{ fontSize: "12px" }}>
              {error}
            </p>
          )}

          <p className="mt-5 text-muted-foreground text-center" style={{ fontSize: "11px", lineHeight: "1.5" }}>
            Access is restricted to authorised Bike First! staff.<br/>
            Contact your admin if you need access.
          </p>
        </div>
      </div>

      <p className="text-white/35 text-center pb-8" style={{ fontSize: "11px" }}>
        © 2026 Bike First! · All rights reserved
      </p>
    </div>
  );
}
