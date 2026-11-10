import React from "react";
import { Button } from "./ui/button";
export default function PremiumLock({ feature = "This feature", compact = false }) {
  if (compact) return <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">🔒 Premium</span>;
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-dashed border-amber-200">
      <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-4 text-3xl">👑</div>
      <h3 className="text-lg font-bold mb-2" style={{color:"hsl(var(--navy))"}}>🔒 Premium Feature</h3>
      <p className="text-muted-foreground text-sm mb-5 max-w-xs"><strong>{feature}</strong> is available on the Premium Plan. Upgrade to unlock advanced analytics, AI insights, part-wise marks, and more.</p>
      <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">👑 Upgrade to Premium</Button>
    </div>
  );
}