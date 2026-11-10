
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function SuperLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password, "super_user");
      navigate("/dashboard/super");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid super admin credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-inter">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white text-sm font-bold">
              E
            </div>
            <div>
              <div
                className="font-bold text-[1.55rem] leading-none"
                style={{ color: "hsl(var(--navy))" }}
              >
                EduManage
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-primary/70">
                Control Center
              </div>
            </div>
          </Link>

          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            School Login
          </Link>
        </div>
      </nav>

      <section className="min-h-screen pt-28 pb-10 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-background to-blue-50/30 pointer-events-none" />

        <div className="max-w-md mx-auto relative">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-5 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Super Admin Access
            </div>

            <h1
              className="text-4xl font-bold mb-3"
              style={{ color: "hsl(var(--navy))" }}
            >
              Control Center Login
            </h1>

            <p className="text-base text-muted-foreground leading-7">
              Dedicated access for platform owner operations, school plan
              controls, and priority notifications.
            </p>
          </div>

          <div className="rounded-[26px] bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.10)] border border-border">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  className="text-sm font-medium block mb-2"
                  style={{ color: "hsl(var(--navy))" }}
                >
                  Super Admin Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter your admin email"
                  className="w-full h-11 px-4 rounded-2xl border border-input bg-blue-50/70 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium block mb-2"
                  style={{ color: "hsl(var(--navy))" }}
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full h-11 px-4 pr-14 rounded-2xl border border-input bg-blue-50/70 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-semibold text-base hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In to Control Center"
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Authorized super administrators only.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
