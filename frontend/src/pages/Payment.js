import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/api";

const plans = [
  { id:"basic", name:"Basic", price:29, icon:"⚡", features:["Up to 500 students","Attendance tracking","Total marks entry (out of 100)","Basic analytics","Manual announcements"] },
  { id:"premium", name:"Premium", price:79, icon:"👑", badge:"Most Popular", features:["Up to 1500 students","Part-wise marks (A/B/C/D)","Advanced analytics & trends","AI insights & smart alerts","AI-assisted announcements","Individual student comparison"] },
];

export default function Payment() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ schoolName:"", adminName:"", email:"", password:"", card:"", expiry:"", cvv:"" });

  const handlePayment = async (e) => {
    e.preventDefault(); setProcessing(true); setError("");
    try {
      const { data } = await API.post("/auth/register", {
        school_name: form.schoolName,
        admin_name: form.adminName,
        email: form.email,
        password: form.password,
        plan: selectedPlan
      });
      await API.post("/auth/payment", { school_id: data.school_id });
      setStep(3);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) { setError(err.response?.data?.message || "Registration failed. Try again."); setProcessing(false); }
  };

  if (step === 3) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✅</div>
        <h2 className="text-3xl font-bold mb-3" style={{color:"hsl(var(--navy))"}}>Payment Successful!</h2>
        <p className="text-muted-foreground mb-3">Welcome to EduManage {selectedPlan === "premium" ? "Premium" : "Basic"}!</p>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${selectedPlan === "premium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
          {selectedPlan === "premium" ? "👑 Premium Plan Activated" : "⚡ Basic Plan Activated"}
        </span>
        <p className="text-sm text-muted-foreground mt-6">Redirecting to login...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-inter">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm font-bold">E</div>
            <span className="font-bold text-xl" style={{color:"hsl(var(--navy))"}}>EduManage</span>
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Already have an account?</Link>
        </div>
      </nav>
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {step === 1 && (
            <div>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-3" style={{color:"hsl(var(--navy))"}}>Choose Your Plan</h1>
                <p className="text-muted-foreground text-lg">Start managing your school smarter today</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {plans.map(plan => (
                  <div key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                    className={`relative cursor-pointer rounded-2xl border-2 p-8 transition-all bg-white ${selectedPlan === plan.id ? "border-primary bg-primary/5 shadow-lg" : "border-border hover:border-primary/50"}`}>
                    {plan.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full">{plan.badge}</div>}
                    <div className="text-3xl mb-3">{plan.icon}</div>
                    <h3 className="font-bold text-xl mb-1" style={{color:"hsl(var(--navy))"}}>{plan.name}</h3>
                    <div className="text-3xl font-bold text-primary mb-6">${plan.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
                    <ul className="space-y-2">
                      {plan.features.map((f,i) => <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground"><span className="text-green-500 font-bold">✓</span>{f}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <button onClick={() => setStep(2)} className="bg-primary text-white px-12 py-4 rounded-xl text-base font-semibold hover:bg-primary/90 transition-colors">
                  Continue with {selectedPlan === "premium" ? "Premium" : "Basic"} — ${selectedPlan === "premium" ? 79 : 29}/mo
                </button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="max-w-md mx-auto">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm transition-colors">← Back to plans</button>
              <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b">
                  <span className="text-2xl">💳</span>
                  <div>
                    <h2 className="font-bold text-xl" style={{color:"hsl(var(--navy))"}}>School Registration</h2>
                    <p className="text-sm text-muted-foreground">{selectedPlan === "premium" ? "👑 Premium — $79/mo" : "⚡ Basic — $29/mo"}</p>
                  </div>
                </div>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
                <form onSubmit={handlePayment} className="space-y-4">
                  {[{label:"School Name",key:"schoolName",placeholder:"Springfield High School"},{label:"Admin Name",key:"adminName",placeholder:"John Smith"},{label:"Admin Email",type:"email",key:"email",placeholder:"admin@school.edu"},{label:"Password",type:"password",key:"password",placeholder:"Create a strong password"}].map(f => (
                    <div key={f.key}>
                      <label className="text-sm font-medium block mb-1.5" style={{color:"hsl(var(--navy))"}}>{f.label}</label>
                      <input type={f.type || "text"} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({...form,[f.key]:e.target.value})} required
                        className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Payment Details (Demo)</p>
                    <input placeholder="4242 4242 4242 4242" value={form.card} onChange={e => setForm({...form,card:e.target.value})} required maxLength={19}
                      className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-3" />
                    <div className="grid grid-cols-2 gap-3">
                      {[{key:"expiry",ph:"MM/YY",max:5},{key:"cvv",ph:"CVV",max:3}].map(f => (
                        <input key={f.key} placeholder={f.ph} value={form[f.key]} onChange={e => setForm({...form,[f.key]:e.target.value})} required maxLength={f.max}
                          className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={processing} className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-base mt-2 disabled:opacity-50 hover:bg-primary/90 transition-colors">
                    {processing ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</span> : `🔒 Pay $${selectedPlan === "premium" ? 79 : 29} & Activate School`}
                  </button>
                  <p className="text-xs text-center text-muted-foreground">🔒 Demo payment — no real charge. Account created in MySQL.</p>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
