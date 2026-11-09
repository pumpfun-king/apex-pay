"use client";

import React, { useState, useMemo } from "react";
import {
  FiatChannel,
  isBuyChannelPermitted,
  isSellChannelPermitted,
} from "@/lib/fiatChannels";
import { Search, X, Check, AlertCircle, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/web3";

interface FiatCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "BUY" | "SELL";
  selectedCode: string;
  onSelect: (code: string) => void;
  fiatChannels: FiatChannel[];
}

export const FiatCurrencyModal: React.FC<FiatCurrencyModalProps> = ({
  isOpen,
  onClose,
  mode,
  selectedCode,
  onSelect,
  fiatChannels,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChannels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return fiatChannels;
    return fiatChannels.filter(
      (c) =>
        c.code.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term) ||
        c.symbol.toLowerCase().includes(term)
    );
  }, [fiatChannels, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fiat-modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-black/5 bg-[#FAFAFA] flex items-center justify-between">
          <div>
            <h3
              id="fiat-modal-title"
              className="text-base font-extrabold text-[#0A0B0E] flex items-center gap-2"
            >
              <span>Select Fiat Currency</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0A0B0E] text-[#FFC700] uppercase font-black tracking-wider">
                {mode === "BUY" ? "Deposit Rails" : "Payout Rails"}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {mode === "BUY"
                ? "Choose local currency to spend and buy USDT"
                : "Choose local currency to receive in your bank"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-black/5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by currency name, code (NGN, USD, KES)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F4F6] border border-black/5 text-xs text-[#0A0B0E] font-medium placeholder-zinc-400 focus:outline-none focus:border-[#0A0B0E] focus:bg-white transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Currency List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-black/[0.03]">
          {filteredChannels.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              No currencies match &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isSelected = channel.code === selectedCode;
              const permission =
                mode === "BUY"
                  ? isBuyChannelPermitted(channel)
                  : isSellChannelPermitted(channel);
              const isAvailable = permission.permitted;
              const rate =
                mode === "BUY" ? channel.buyRate : channel.sellRate;

              return (
                <button
                  key={channel.code}
                  type="button"
                  onClick={() => {
                    onSelect(channel.code);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all group ${
                    isSelected
                      ? "bg-[#FFF8DB] border border-[#FDE68A]"
                      : "hover:bg-zinc-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0 leading-none">
                      {channel.flag || "🌐"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#0A0B0E]">
                          {channel.code}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          {channel.symbol}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#0A0B0E] text-[#FFC700] text-[9px] font-bold">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {channel.name}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <div className="font-mono text-xs font-bold text-[#0A0B0E]">
                      1 USDT = {formatCurrency(rate, channel.symbol, 2)}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          <Check className="w-2.5 h-2.5" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-semibold border border-zinc-200" title={permission.reason}>
                          <AlertCircle className="w-2.5 h-2.5 text-zinc-400" />
                          <span>Unavailable</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-[#FAFAFA] border-t border-black/5 text-[11px] text-zinc-500 flex items-center justify-between">
          <span className="flex items-center gap-1 text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-[#FFC700]" />
            Rates updated from treasury oracles
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            {fiatChannels.length} Currencies Configured
          </span>
        </div>
      </div>
    </div>
  );
};
