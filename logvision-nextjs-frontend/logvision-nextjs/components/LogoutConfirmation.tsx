"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, X } from "lucide-react";
import { getAdminConfiguration } from "@/lib/api";

interface LogoutConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmation({ isOpen, onClose, onConfirm }: LogoutConfirmationProps) {
  const [closing, setClosing] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    if (isOpen) {
      document.body.style.overflow = "hidden";
      getAdminConfiguration().then(res => {
        const timeout = Math.max(1, res.data?.parameters?.logout_timeout_seconds || 15);
        setMaxTime(timeout);
        setTimeLeft(timeout);
      });
    } else {
      setClosing(false);
      setShaking(false);
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const resetTimer = () => setTimeLeft(maxTime);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      resetTimer();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", resetTimer);

    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", resetTimer);
    };
  }, [isOpen, onConfirm, maxTime]);

  if (!mounted || !isOpen) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 200); // Match animation duration
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return createPortal(
    <div 
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 ${closing ? 'animate-out fade-out' : ''}`}
    >
      <div className={`w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b1220] p-8 shadow-[0_0_50px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300 ${closing ? 'animate-out zoom-out' : ''} ${shaking ? 'animate-shake' : ''}`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.15)]">
            <LogOut className="h-6 w-6" />
          </div>
          <button onClick={handleClose} title="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <h3 className="text-xl font-bold text-white tracking-tight">Quitter la session ?</h3>
        <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous ré-authentifier pour accéder à LogVision.</p>

        <div className="mt-3 flex items-center gap-2">
          <progress className="h-1 flex-1 w-full appearance-none overflow-hidden rounded-full bg-white/5 accent-red-600" value={timeLeft} max={maxTime || 1} />
          <span className="text-[10px] font-bold tabular-nums text-red-500/80">{timeLeft}s</span>
        </div>
        
        <div className="mt-8 flex gap-3">
          <button onClick={handleClose} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-600 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_0_25px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95 transition-all">
            Confirmer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}