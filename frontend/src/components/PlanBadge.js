import React from "react";
import { Badge } from "./ui/badge";
export default function PlanBadge({ plan }) {
  if (plan === "premium") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-semibold">👑 Premium</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-semibold">⚡ Basic</Badge>;
}