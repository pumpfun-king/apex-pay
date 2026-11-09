"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "pending_payment":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF8DB] text-[#B45309] border border-[#FDE68A] whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 animate-pulse text-[#D97706]" />
          Pending Payment
        </span>
      );
    case "pending_fiat_payout":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-500/30 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
          Pending Fiat Payout
        </span>
      );
    case "payment_confirmed":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 border border-sky-500/30 whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
          Payment Confirmed
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0A0B0E] text-[#FFC700] border border-[#0A0B0E] whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC700]" />
          Completed
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 border border-rose-500/30 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    case "cancelled":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-200/70 text-zinc-600 border border-zinc-300 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
  }
}
