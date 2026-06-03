"use client";

import React, { useState, useRef, useEffect } from "react";
import { Trash2, X, ChevronRight } from "lucide-react";

interface SlideToDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}

export function SlideToDeleteModal({ isOpen, onClose, onConfirm, itemName }: SlideToDeleteModalProps) {
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setSliderPos(0);
  }, [isOpen]);

  const handleStart = () => setIsDragging(true);
  const handleEnd = () => {
    setIsDragging(false);
    if (sliderPos > 90) {
      onConfirm();
      onClose();
    } else {
      setSliderPos(0);
    }
  };

  const handleMove = (e: React.PointerEvent | PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = ((e as PointerEvent).clientX - rect.left);
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
            <Trash2 className="h-6 w-6" />
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-white/5 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight">Supprimer l'utilisateur ?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette action est irréversible. Vous êtes sur le point de supprimer <span className="font-bold text-red-400">{itemName}</span>.
        </p>

        {/* Slider Track */}
        <div 
          ref={trackRef}
          onPointerMove={handleMove}
          onPointerUp={handleEnd}
          onPointerLeave={handleEnd}
          className="relative mt-8 h-14 w-full overflow-hidden rounded-xl bg-secondary/30 border border-white/5 select-none"
        >
          <div 
            className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-white/20"
            style={{ opacity: 1 - sliderPos / 100 }}
          >
            Glisser pour confirmer
          </div>

          {/* Filler glow */}
          <div 
            className="absolute inset-y-0 left-0 bg-red-600/20 transition-all"
            style={{ width: `${sliderPos}%` }}
          />

          {/* Handle */}
          <div
            onPointerDown={handleStart}
            className={`absolute top-1 bottom-1 left-1 aspect-square rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg cursor-grab active:cursor-grabbing transition-transform ${sliderPos > 95 ? 'scale-90 bg-emerald-500' : ''}`}
            style={{ 
              transform: `translateX(${sliderPos * (trackRef.current ? (trackRef.current.offsetWidth - 60) / 100 : 0)}px)`,
            }}
          >
            <ChevronRight className={`h-6 w-6 transition-transform ${sliderPos > 90 ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </div>
    </div>
  );
}