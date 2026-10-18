import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { WeddingConfig, Guest } from '../types/wedding';

interface EnvelopeUnveilProps {
  config: WeddingConfig;
  activeGuest: Guest | null;
  onOpen: () => void;
}

export const requestNativeFullscreen = () => {
  try {
    const doc = document as any;
    const isFullscreen =
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (isFullscreen) return;

    const el = document.documentElement as any;
    if (typeof el.requestFullscreen === 'function') {
      const promise = el.requestFullscreen({ navigationUI: 'hide' });
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          try {
            el.requestFullscreen().catch(() => {});
          } catch {}
        });
      }
      return;
    }

    const webkitMethod =
      el.webkitRequestFullscreen ||
      el.webkitRequestFullScreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (typeof webkitMethod === 'function') {
      webkitMethod.call(el);
      return;
    }
  } catch {
    // Browser prevented fullscreen
  }

  // Fallback for iOS WebKit where Apple restricts the Fullscreen API on iPhone
  try {
    window.scrollTo(0, 1);
  } catch {}
};

export const EnvelopeUnveil: React.FC<EnvelopeUnveilProps> = ({
  config,
  activeGuest,
  onOpen,
}) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenEnvelope = () => {
    // 1. Trigger native browser fullscreen synchronously inside the raw user gesture
    // before any React state updates, button disablement, or DOM mutations occur
    requestNativeFullscreen();

    if (isOpening) return;
    setIsOpening(true);

    // 2. Delay confetti & transition slightly so Chrome completes fullscreen enter smoothly
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#4D533C', '#FAF7F0', '#EFE6D5', '#7A875D', '#D5C3A5'],
        });
      } catch {
        // ignore
      }
    }, 120);

    setTimeout(() => {
      onOpen();
    }, 550);
  };

  return (
    <div
      onClick={handleOpenEnvelope}
      onTouchEnd={handleOpenEnvelope}
      className="fixed inset-0 z-50 bg-[#F8F5EE] flex items-center justify-center p-4 select-none overflow-hidden safe-pb safe-pt cursor-pointer"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-radial from-[#A0B98A]/25 via-transparent to-transparent pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/5 w-2 h-2 rounded-full bg-[#7A875D]/40 blur-xs animate-dust" />
      <div className="absolute bottom-1/4 right-1/5 w-2.5 h-2.5 rounded-full bg-[#EFE6D5]/40 blur-xs animate-dust [animation-delay:3s]" />

      {/* Royal Silk Cream Envelope Card */}
      <div
        className={`w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#FAF5EA] via-[#EFE7D8] to-[#E3D6BF] border-2 border-[#545E46]/50 rounded-3xl p-7 sm:p-10 text-center text-[#24301C] shadow-2xl relative transition-all duration-700 gold-box-glow overflow-hidden cursor-pointer ${
          isOpening ? 'scale-105 opacity-0 -translate-y-8' : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        {/* Faint Couple Backdrop inside Envelope */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
          <img
            src={config.backgroundImageUrl && !config.backgroundImageUrl.includes('aistudio.google.com') ? config.backgroundImageUrl : '/assets/images/couple_portrait.jpg'}
            alt={config.coupleNames}
            className="w-full h-full object-cover object-center opacity-10 filter blur-[0.5px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF5EA]/90 via-[#EFE7D8]/80 to-[#EFE7D8]/95" />
        </div>

        {/* Inner border */}
        <div className="absolute inset-2.5 border border-[#C7B99D] rounded-2xl pointer-events-none z-10" />

        <div className="relative z-10">
          {/* Envelope Top Flap Graphic */}
          <div className="w-16 h-1 bg-[#545E46]/70 mx-auto rounded-full mb-6" />

          <div className="space-y-2 mb-6">
            <p className="font-cinzel uppercase text-[10px] tracking-[0.3em] text-[#545E46] font-bold">
              Official Wedding Invitation
            </p>

            <p className="font-serif-luxury italic text-xs text-[#48533C]">
              {activeGuest?.name ? (
                <>Specially prepared for <strong className="text-[#24301C] font-bold">{activeGuest.name}</strong></>
              ) : (
                'You are cordially invited to celebrate'
              )}
            </p>
          </div>

          {/* Wax Seal Monogram Crest - Olive Green Wax with Cream Monogram */}
          <div className="my-6 relative inline-block">
            <button
              type="button"
              onClick={handleOpenEnvelope}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#545E46] via-[#3B462F] to-[#242D1C] p-[3px] shadow-xl animate-seal-glow cursor-pointer transition-transform hover:scale-105 active:scale-95 group focus:outline-none"
              aria-label="Tap seal to open invitation"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#3B462F] to-[#242D1C] border-2 border-[#E8DEC6]/80 flex flex-col items-center justify-center p-2 shadow-inner">
                <span className="font-wedding text-3xl sm:text-4xl text-[#FAF5EA] leading-none pt-1 group-hover:scale-110 transition-transform drop-shadow font-bold">
                  T&S
                </span>
                <span className="font-cinzel text-[7px] uppercase tracking-widest text-[#E8DEC6] mt-0.5 font-bold">
                  21.12.26
                </span>
              </div>
            </button>
          </div>

          {/* Couple Title */}
          <div className="space-y-1 mb-8">
            <h2 className="font-wedding italic text-3xl sm:text-4xl text-[#24301C] tracking-wide leading-tight font-semibold">
              {config.coupleNames}
            </h2>
            <p className="font-serif-luxury text-xs text-[#545E46] tracking-wider font-medium">
              {config.venueName} · 851 Goodhope Road
            </p>
          </div>

          {/* Fullscreen CTA Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleOpenEnvelope}
              className="w-full py-3.5 px-6 btn-olive-luxury font-cinzel text-xs font-bold tracking-[0.2em] uppercase rounded-full shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>✦</span>
              <span>Tap to Open Invitation</span>
              <span>✦</span>
            </button>

            <p className="font-serif-luxury text-[11px] text-stone-500 font-medium">
              Opens in full-screen on mobile devices
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
