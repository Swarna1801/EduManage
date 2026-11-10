import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const roles = [
  { id: "principal", label: "Principal", icon: "PS" },
  { id: "teacher", label: "Teacher", icon: "TC" },
  { id: "parent", label: "Parent", icon: "PR" },
];

const supportNotes = [
  "Secure role-based access",
  "Live analytics and operations",
  "Built for principals, teachers, and parents",
];



export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState("principal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeRole = useMemo(
    () => roles.find((role) => role.id === selectedRole) || roles[0],
    [selectedRole]
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userData = await login(email, password, selectedRole);
      const role = userData.role || selectedRole;
      if (role === "principal") navigate("/dashboard/principal");
      else if (role === "teacher") navigate("/dashboard/teacher");
      else if (role === "parent") navigate("/dashboard/parent");
      else navigate("/dashboard/principal");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-inter">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white text-sm font-bold">E</div>
            <div>
              <div className="font-bold text-[1.55rem] leading-none" style={{ color: "hsl(var(--navy))" }}>
                EduManage
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-primary/70">Smart School OS</div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Back to Home
            </Link>
            <Link to="/payment" className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-28 pb-10 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-background to-amber-50/20 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="pt-8">
              <div className="inline-flex items-center gap-2 mb-5 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Premium School Login
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] mb-5" style={{ color: "hsl(var(--navy))" }}>
                Welcome back to your smarter school workspace.
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-8">
                Sign in to manage attendance, academics, communication, and operations with a clean premium dashboard.
              </p>

              <div className="mt-8 space-y-4 max-w-xl">
                {supportNotes.map((item) => (
                  <div key={item} className="rounded-2xl border border-border bg-white px-5 py-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <p className="text-base font-medium" style={{ color: "hsl(var(--navy))" }}>
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full max-w-[720px] mx-auto">
              <div className="mb-5 rounded-[24px] border border-blue-100 bg-white/90 p-2.5 shadow-[0_18px_50px_rgba(37,99,235,0.10)]">
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((role) => {
                    const isActive = selectedRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`flex min-h-[68px] items-center justify-center gap-2 rounded-[18px] px-3 py-3 text-center transition-all ${
                          isActive
                            ? "bg-primary text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]"
                            : "bg-transparent text-slate-600 hover:bg-blue-50 hover:text-slate-900"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-extrabold ${
                            isActive ? "bg-white/15 text-white" : "bg-blue-50 text-primary"
                          }`}
                        >
                          {role.icon}
                        </span>
                        <span className="text-sm font-medium leading-5">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[26px] bg-white p-6 shadow-[0_24px_60px_rgba(37,99,235,0.10)] border border-border">
                <div className="mb-5 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                    <GraduationCap className="h-4 w-4 text-emerald-300" />
                    Secure Access
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sign in as <span className="font-semibold" style={{ color: "hsl(var(--navy))" }}>{activeRole.label}</span>
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: "hsl(var(--navy))" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className="w-full h-11 px-4 rounded-2xl border border-input bg-blue-50/70 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: "hsl(var(--navy))" }}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter password"
                        className="w-full h-11 px-4 pr-14 rounded-2xl border border-input bg-blue-50/70 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        aria-label={showPass ? "Hide password" : "Show password"}
                      >
                        {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                    className="w-full bg-primary text-white py-3 rounded-2xl font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      `Sign In as ${activeRole.label}`
                    )}
                  </button>
                </form>
              </div>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Need a new account?{" "}
                <Link to="/payment" className="font-semibold text-primary hover:text-primary/80">
                  Choose a subscription plan
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
