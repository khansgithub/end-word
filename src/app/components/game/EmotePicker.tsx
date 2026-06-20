"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EMOTE_OPTIONS, emoteSrc } from "@/shared/emote";

export interface EmotePickerProps {
  open: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export default function EmotePicker({ open, onSelect, onClose, anchorRef }: EmotePickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerTop, setPickerTop] = useState(0);
  const [pickerLeft, setPickerLeft] = useState(0);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPickerTop(rect.top - 8);
    setPickerLeft(rect.left + rect.width / 2);
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, anchorRef]);

  return (
    <AnimatePresence>
      {open && (
        <div
          ref={pickerRef}
          style={{
            position: "fixed",
            top: pickerTop,
            left: pickerLeft,
            transform: "translate(-50%, -100%)",
            zIndex: 100,
          }}
        >
          <motion.div
            className="g2-emote-picker"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="g2-emote-picker-grid">
              {EMOTE_OPTIONS.map((emo) => (
                <button
                  key={emo.value}
                  type="button"
                  className="g2-emote-picker-btn"
                  onClick={() => onSelect(emo.value)}
                  title={emo.label}
                  aria-label={emo.label}
                >
                  <img src={emoteSrc(emo.value)} alt={emo.label} className="g2-emote-picker-emoji" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
