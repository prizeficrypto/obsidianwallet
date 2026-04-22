"use client";

import { useState } from "react";
import { Copy, CheckCheck, QrCode, X } from "lucide-react";
import ChainIcon from "@/components/ChainIcon";

interface ReceiveModalProps {
  address: string;
  onClose: () => void;
}

function shortenAddr(addr: string, chars = 6): string {
  if (!addr) return "";
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

function CopyBtn({ text, size = 40 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center justify-center rounded-full active:scale-90 transition-transform flex-shrink-0"
      style={{ width: size, height: size, background: "#2a2a2a" }}
    >
      {copied
        ? <CheckCheck size={15} className="text-emerald-400" />
        : <Copy size={15} className="text-white/60" />
      }
    </button>
  );
}

function QRModal({ address, onClose }: { address: string; onClose: () => void }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}&bgcolor=111111&color=ffffff&margin=8&format=png`;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
      <div
        className="relative rounded-t-3xl w-full max-w-[430px] p-6 flex flex-col items-center gap-5"
        style={{ background: "#111111" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/10 mb-1" />
        <p className="text-base font-bold text-white">Your World Chain Address</p>
        <div className="rounded-2xl overflow-hidden p-3" style={{ background: "#1a1a1a" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR Code" width={200} height={200} className="rounded-xl" />
        </div>
        <div className="w-full rounded-2xl px-4 py-3" style={{ background: "#1a1a1a" }}>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Address</p>
          <p className="text-xs font-mono text-white/60 break-all">{address}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ background: "#ffffff", color: "#111111" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function ReceiveModal({ address, onClose }: ReceiveModalProps) {
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <div className="flex flex-col h-full" style={{ background: "#0a0a0a" }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pb-4"
          style={{ paddingTop: "max(env(safe-area-inset-top), 48px)" }}
        >
          <h2 className="text-lg font-bold text-white">Receive</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "#1e1e1e" }}
          >
            <X size={16} className="text-white/60" />
          </button>
        </div>

        {/* World Chain receive */}
        <div className="flex-1 px-4 space-y-6">
          <p className="text-xs text-white/30">
            Send tokens to this address on World Chain
          </p>

          {/* Network badge */}
          <div
            className="flex items-center gap-3 px-4 py-4 rounded-2xl"
            style={{ background: "#161616" }}
          >
            <ChainIcon chainId="world-chain" size={44} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-white">World Chain</p>
              <p className="text-xs text-white/40 font-mono mt-0.5 truncate">
                {shortenAddr(address)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center justify-center rounded-full active:scale-90 transition-transform"
                style={{ width: 40, height: 40, background: "#2a2a2a" }}
              >
                <QrCode size={15} className="text-white/60" />
              </button>
              <CopyBtn text={address} />
            </div>
          </div>

          {/* Full address card */}
          <div className="rounded-2xl px-4 py-4" style={{ background: "#161616" }}>
            <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">
              Full address
            </p>
            <p className="text-[13px] font-mono text-white/55 break-all leading-relaxed">
              {address}
            </p>
          </div>

          {/* Info note */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.1)" }}
          >
            <p className="text-[12px] text-white/35 leading-relaxed">
              This address receives WLD, ETH, and all ERC-20 tokens on World Chain.
            </p>
          </div>
        </div>

        {/* Close */}
        <div
          className="px-4 pt-4 border-t"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
          }}
        >
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl text-sm font-semibold text-white/70"
            style={{ background: "#1e1e1e" }}
          >
            Close
          </button>
        </div>
      </div>

      {/* QR overlay */}
      {showQR && (
        <QRModal
          address={address}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}
