import React from "react";
import Link from "next/link";
import { Hexagon, ArrowLeft, Compass, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#EEF0F4] text-[#0A0B0E] flex flex-col justify-between p-4 sm:p-8">
      {/* Top Minimal Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <Link href="/" aria-label="Home" className="flex items-center group">
          <div className="w-10 h-10 rounded-full bg-[#FFC700] flex items-center justify-center shadow-md shadow-[#FFC700]/30 group-hover:scale-105 transition-transform">
            <Hexagon className="w-5 h-5 text-white fill-white stroke-[#0A0B0E] stroke-[2.2]" />
          </div>
        </Link>

        <span className="px-3.5 py-1.5 rounded-full bg-white border border-black/[0.06] text-xs font-bold text-zinc-500">
          HTTP 404 • Route Not Found
        </span>
      </header>

      {/* Main Split 404 Card */}
      <main className="max-w-5xl w-full mx-auto my-8">
        <div className="rounded-[28px] sm:rounded-[36px] bg-white shadow-2xl shadow-black/[0.06] border border-black/[0.05] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left 7 Cols: Editorial 404 Message */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF8DB] text-[#B45309] border border-[#FDE68A] text-xs font-extrabold">
                <ShieldAlert className="w-4 h-4 text-[#D97706]" />
                <span>Unmapped Block or Directory</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#0A0B0E] leading-[1.08]">
                404 — Page
                <br />
                Off-Chain.
              </h1>

              <p className="text-sm sm:text-base text-zinc-500 max-w-md leading-relaxed">
                The directory or link you requested does not perform an active
                function on <strong className="text-[#0A0B0E]">Cryptohive</strong>{" "}
                or has been moved. Return to the main exchange desk to trade
                USDT with live quotes.
              </p>

              <div className="pt-3 flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="group inline-flex items-center gap-3.5 pl-2 pr-7 py-2 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm shadow-xl transition-all"
                >
                  <span className="w-9 h-9 rounded-full bg-[#FFC700] flex items-center justify-center text-black group-hover:-translate-x-0.5 transition-transform">
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  </span>
                  <span>Back to Cryptohive Exchange</span>
                </Link>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
              <span>Status: Non-existent route</span>
              <span className="font-mono text-[#0A0B0E] font-bold">
                ERR_HIVE_404
              </span>
            </div>
          </div>

          {/* Right 5 Cols: Vibrant Hive-Yellow Visual Panel */}
          <div className="lg:col-span-5 bg-[#FFC700] p-8 sm:p-12 relative flex flex-col items-center justify-center min-h-[280px] sm:min-h-[360px] overflow-hidden">
            <div className="relative z-10 w-56 rounded-[30px] hive-obsidian-card p-6 text-white shadow-2xl border-2 border-zinc-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FFC700]/15 border border-[#FFC700]/40 flex items-center justify-center text-[#FFC700] mx-auto">
                <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: "8s" }} />
              </div>
              <div>
                <div className="text-3xl font-black font-mono text-[#FFC700]">
                  404
                </div>
                <div className="text-xs font-bold text-white mt-1">
                  Destination Not Found
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  No smart contract or route is bound to this URL path.
                </p>
              </div>
              <Link
                href="/"
                className="block w-full py-2 rounded-full bg-[#FFC700] text-black text-xs font-extrabold hover:bg-[#ffcf26] transition-colors"
              >
                Launch OTC Desk
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-zinc-400 py-2">
        Cryptohive Digital Asset Exchange • 24/7 Web3 OTC Settlement
      </footer>
    </div>
  );
}
