import React from "react";
import { Link } from "react-router-dom";

const features = [
  { icon:"👥", title:"Multi-Role Access", desc:"Separate dashboards for Principals, Teachers, and Parents" },
  { icon:"📊", title:"Analytics & Reports", desc:"Real-time charts and insights on student performance" },
  { icon:"📚", title:"Attendance Tracking", desc:"Mark and monitor daily attendance with ease" },
  { icon:"🔔", title:"Smart Notifications", desc:"Instant alerts for fees, grades, and important events" },
  { icon:"🏆", title:"Marks Management", desc:"Upload and track exam results across all subjects" },
  { icon:"🔒", title:"Secure & Reliable", desc:"Role-based access control with enterprise security" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background font-inter">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm font-bold">E</div>
            <span className="font-bold text-xl" style={{color:"hsl(var(--navy))"}}>EduManage</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-md hover:bg-accent transition-colors">Sign In</Link>
            <Link to="/payment" className="bg-primary text-white text-sm font-medium px-6 py-2 rounded-md hover:bg-primary/90 transition-colors">Get Started</Link>
          </div>
        </div>
      </nav>
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-background to-amber-50/30 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-6 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-sm font-medium">🎓 Next-Gen School Management</div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6" style={{color:"hsl(var(--navy))"}}>
              Manage Your School<span className="block text-primary">Smarter & Faster</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">EduManage brings principals, teachers, and parents together on one powerful platform — tracking attendance, grades, fees, and more in real time.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/payment" className="bg-primary text-white text-base px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center">Start Free Trial →</Link>
              <Link to="/login" className="border-2 border-border text-base px-8 py-4 rounded-xl font-semibold hover:border-primary/50 transition-all inline-flex items-center justify-center" style={{color:"hsl(var(--navy))"}}>Sign In to Dashboard</Link>
            </div>
          </div>
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[{value:"500+",label:"Schools"},{value:"50K+",label:"Students"},{value:"98%",label:"Satisfaction"},{value:"24/7",label:"Support"}].map((s,i) => (
              <div key={i} className="text-center p-6 bg-white rounded-2xl border border-border shadow-sm">
                <div className="text-3xl font-bold text-primary mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{color:"hsl(var(--navy))"}}>Everything You Need</h2>
            <p className="text-muted-foreground text-lg">A complete ecosystem for modern school administration</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f,i) => (
              <div key={i} className="p-6 rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-2xl group-hover:bg-primary/20 transition-colors">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2" style={{color:"hsl(var(--navy))"}}>{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 text-white" style={{background:"linear-gradient(135deg,hsl(222,47%,11%),hsl(221,83%,20%))"}}>
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Three Roles, One Platform</h2>
          <p className="text-blue-200 text-lg mb-16">Tailored experience for every stakeholder</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[{role:"Principal",icon:"🛡️",desc:"Full control over analytics, teacher performance and school-wide operations."},{role:"Teacher",icon:"📖",desc:"Manage classes, mark attendance, upload grades, and communicate with parents."},{role:"Parent",icon:"👨‍👩‍👧",desc:"Track your child's attendance, performance, and fee status in real time."}].map((r,i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <div className="text-4xl mb-4">{r.icon}</div>
                <h3 className="text-xl font-bold mb-3">{r.role}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{color:"hsl(var(--navy))"}}>Ready to Transform Your School?</h2>
          <p className="text-muted-foreground text-lg mb-10">Join hundreds of schools already using EduManage.</p>
          <Link to="/payment" className="bg-primary text-white text-base px-10 py-4 rounded-xl font-semibold shadow-lg inline-flex items-center justify-center hover:bg-primary/90 transition-colors">Choose Your Plan →</Link>
        </div>
      </section>
      <footer className="py-8 px-6 border-t text-center text-sm text-muted-foreground">
        <p className="font-bold text-primary mb-1">🎓 EduManage</p>
        <p>© 2026 EduManage. All rights reserved.</p>
      </footer>
    </div>
  );
}