import React, { useState } from 'react';
import { Guest, WeddingConfig } from '../types/wedding';
import { CountdownTimer } from './CountdownTimer';

interface InvitationCardProps {
  config: WeddingConfig;
  activeGuest: Guest | null;
  onOpenRSVP: () => void;
  onOpenPass: () => void;
  onNavigate: (view: 'invitation' | 'map' | 'pass' | 'gate' | 'admin') => void;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({
  config,
  activeGuest,
  onOpenRSVP,
  onOpenPass,
  onNavigate: _onNavigate,
}) => {
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);

  const bgImage = config.backgroundImageUrl && !config.backgroundImageUrl.includes('aistudio.google.com')
    ? config.backgroundImageUrl
    : '/assets/images/couple_portrait.jpg';

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 relative">
      {/* Ambient delicate olive & cream floating particles */}
      <div className="absolute top-10 left-4 sm:left-8 w-2 h-2 rounded-full bg-[#545E46]/35 blur-xs animate-dust pointer-events-none" />
      <div className="absolute top-32 right-6 sm:right-12 w-2.5 h-2.5 rounded-full bg-[#C7B99D]/40 blur-xs animate-dust [animation-delay:2s] pointer-events-none" />
      <div className="absolute bottom-16 left-8 sm:left-16 w-2 h-2 rounded-full bg-[#758F5C]/40 blur-xs animate-dust [animation-delay:4s] pointer-events-none" />

      {/* Royal Wedding Invitation Card - Authentic Silk Cream & Botanical Olive Green */}
      <section className="relative bg-gradient-to-b from-[#FAF5EA] via-[#EFE7D8] to-[#E3D7C1] border-2 border-[#545E46]/50 rounded-2xl sm:rounded-3xl gold-box-glow p-4 xs:p-6 sm:p-12 text-center text-[#24301C] overflow-hidden shadow-2xl">
        {/* Faint Couple Photographic Watermark Backdrop */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
          <img
            src={bgImage}
            alt={config.coupleNames}
            className="w-full h-full object-cover object-center scale-105"
            style={{ opacity: 0.16 }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF5EA]/85 via-[#EFE7D8]/75 to-[#E3D7C1]/85" />
        </div>

        {/* Inner Delicate Inset Silk Cream Hairline Border */}
        <div className="absolute inset-2 sm:inset-4 border border-[#C7B99D] rounded-xl sm:rounded-2xl pointer-events-none z-10" />

        {/* Ornate Corner Accents in Rich Olive */}
        <div className="absolute top-3 left-3 sm:top-6 sm:left-6 text-[#5D7946]/70 text-base sm:text-xl select-none pointer-events-none z-10">
          ❧
        </div>
        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 text-[#5D7946]/70 text-base sm:text-xl select-none pointer-events-none -scale-x-100 z-10">
          ❧
        </div>
        <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 text-[#5D7946]/70 text-base sm:text-xl select-none pointer-events-none -scale-y-100 z-10">
          ❧
        </div>
        <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 text-[#5D7946]/70 text-base sm:text-xl select-none pointer-events-none -scale-100 z-10">
          ❧
        </div>

        {/* Main Content Layer */}
        <div className="relative z-10 space-y-6 sm:space-y-8">
          {/* Top Monogram Crest */}
          <div className="space-y-2 pt-1 sm:pt-2">
            <div className="inline-flex items-center justify-center relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#545E46] bg-gradient-to-b from-[#F7F2E6] to-[#E5DAC4] flex items-center justify-center shadow-md">
                <span className="font-wedding text-2xl sm:text-3.5xl text-[#26331C] leading-none pt-0.5 font-bold">
                  T&S
                </span>
              </div>
            </div>

            <p className="font-cinzel uppercase text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.35em] text-[#545E46] font-semibold">
              Wedding Celebration
            </p>
          </div>

          {/* Featured Couple Portrait - Ornate Botanical Floral Frame */}
          <div className="flex flex-col items-center justify-center pt-2 pb-3">
            <div className="relative group select-none">
              {/* Outer Ambient Flowery Glow */}
              <div className="absolute -inset-4 rounded-t-[4rem] rounded-b-3xl bg-gradient-to-b from-[#545E46]/25 via-[#FAF5EA]/50 to-[#C7B99D]/30 blur-xl opacity-80 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              {/* Top Flowery Crown Ornament (Blooming Jasmine & Olive Leaves) */}
              <div className="absolute -top-7 inset-x-0 flex items-center justify-center z-20 pointer-events-none drop-shadow-md">
                <svg className="w-48 sm:w-56 h-12 text-[#545E46]" viewBox="0 0 240 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left leafy branch */}
                  <path d="M120 30 C100 24 75 22 45 28 C30 31 15 38 5 46" stroke="#545E46" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M95 25 C92 18 84 16 80 20 C76 24 82 28 95 25 Z" fill="#758F5C" />
                  <path d="M75 24 C70 16 60 16 58 22 C56 27 65 29 75 24 Z" fill="#3B462F" />
                  <path d="M55 26 C48 20 38 22 38 28 C38 33 46 33 55 26 Z" fill="#758F5C" />
                  <path d="M35 32 C28 26 20 28 20 34 C20 39 28 38 35 32 Z" fill="#3B462F" />
                  
                  {/* Right leafy branch */}
                  <path d="M120 30 C140 24 165 22 195 28 C210 31 225 38 235 46" stroke="#545E46" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M145 25 C148 18 156 16 160 20 C164 24 158 28 145 25 Z" fill="#758F5C" />
                  <path d="M165 24 C170 16 180 16 182 22 C184 27 175 29 165 24 Z" fill="#3B462F" />
                  <path d="M185 26 C192 20 202 22 202 28 C202 33 194 33 185 26 Z" fill="#758F5C" />
                  <path d="M205 32 C212 26 220 28 220 34 C220 39 212 38 205 32 Z" fill="#3B462F" />

                  {/* Left Flower Buds */}
                  <circle cx="68" cy="28" r="3.5" fill="#FAF5EA" stroke="#545E46" strokeWidth="1" />
                  <circle cx="42" cy="32" r="3" fill="#FAF5EA" stroke="#545E46" strokeWidth="1" />

                  {/* Right Flower Buds */}
                  <circle cx="172" cy="28" r="3.5" fill="#FAF5EA" stroke="#545E46" strokeWidth="1" />
                  <circle cx="198" cy="32" r="3" fill="#FAF5EA" stroke="#545E46" strokeWidth="1" />

                  {/* Center Blossoming Rose/Jasmine Blossom */}
                  <g transform="translate(120, 28)">
                    {/* Flower Petals */}
                    <path d="M0 -14 C4 -10 4 -4 0 0 C-4 -4 -4 -10 0 -14 Z" fill="#FAF5EA" stroke="#C7B99D" strokeWidth="0.8" />
                    <path d="M14 0 C10 4 4 4 0 0 C4 -4 10 -4 14 0 Z" fill="#EFE7D8" stroke="#C7B99D" strokeWidth="0.8" />
                    <path d="M0 14 C-4 10 -4 4 0 0 C4 4 4 10 0 14 Z" fill="#FAF5EA" stroke="#C7B99D" strokeWidth="0.8" />
                    <path d="M-14 0 C-10 -4 -4 -4 0 0 C-4 4 -10 4 -14 0 Z" fill="#EFE7D8" stroke="#C7B99D" strokeWidth="0.8" />
                    {/* Diagonals */}
                    <path d="M10 -10 C9 -4 4 -4 0 0 C4 -9 9 -9 10 -10 Z" fill="#FAF5EA" stroke="#C7B99D" strokeWidth="0.8" />
                    <path d="M10 10 C4 9 4 4 0 0 C9 4 9 9 10 10 Z" fill="#FAF5EA" stroke="#C7B99D" strokeWidth="0.8" />
                    <path d="M-10 10 C-9 4 -4 4 0 0 C-4 9 -9 9 -10 10 Z" fill="#FAF5EA" stroke="#C7B99D" strokeWidth="0.8" />
                    <path d="M-10 -10 C-4 -9 -4 -4 0 0 C-9 -4 -9 -9 -10 -10 Z" fill="#FAF5EA" stroke="#C7B99D" strokeWidth="0.8" />
                    {/* Golden/Olive Stamen Core */}
                    <circle cx="0" cy="0" r="4.5" fill="#545E46" />
                    <circle cx="0" cy="0" r="2.2" fill="#E8DEC6" />
                  </g>
                </svg>
              </div>

              {/* Master Floral Arbor Frame in Silk Cream & Botanical Olive */}
              <div className="relative p-3 sm:p-4 rounded-t-[3.5rem] rounded-b-2xl sm:rounded-t-[4.5rem] sm:rounded-b-3xl bg-gradient-to-b from-[#FAF5EA] via-[#EAE0CB] to-[#DDD0B7] border-2 border-[#545E46] shadow-[0_15px_45px_-8px_rgba(40,50,30,0.25)]">
                
                {/* Secondary Inset Beaded Botanical Border */}
                <div className="p-1 sm:p-1.5 rounded-t-[3.1rem] rounded-b-xl sm:rounded-t-[4.1rem] sm:rounded-b-2xl bg-[#EFE7D8] border border-[#C7B99D] shadow-inner">
                  
                  {/* Inner Fine Gold-Olive Filigree Ring */}
                  <div className="p-0.5 rounded-t-[2.9rem] rounded-b-lg sm:rounded-t-[3.9rem] sm:rounded-b-xl bg-gradient-to-tr from-[#545E46] via-[#E8DEC6] to-[#758F5C] shadow-xs">
                    
                    {/* The Artwork Canvas / Photo with Cathedral Garden Arch */}
                    <div className="w-56 xs:w-64 sm:w-72 aspect-[3/4] rounded-t-[2.7rem] rounded-b-md sm:rounded-t-[3.7rem] sm:rounded-b-lg overflow-hidden relative bg-[#E5DAC4] shadow-inner">
                      <img
                        src={bgImage}
                        alt={config.coupleNames}
                        className="w-full h-full object-cover object-center transform transition-transform duration-1000 ease-out group-hover:scale-105 filter contrast-[1.02]"
                      />

                      {/* Glass Sheen Light Reflection Sweep */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 opacity-50 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Flowery Bottom Corner Vignettes (Left) */}
                <div className="absolute -bottom-2 -left-2 w-9 h-9 pointer-events-none">
                  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 34 C12 28 20 26 34 26" stroke="#5D7946" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M12 24 C14 18 20 18 20 22 C20 26 15 27 12 24 Z" fill="#7A9961" />
                    <circle cx="10" cy="30" r="3.5" fill="#FFFDF9" stroke="#5D7946" strokeWidth="1" />
                    <circle cx="10" cy="30" r="1.5" fill="#5D7946" />
                  </svg>
                </div>

                {/* Flowery Bottom Corner Vignettes (Right) */}
                <div className="absolute -bottom-2 -right-2 w-9 h-9 pointer-events-none -scale-x-100">
                  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 34 C12 28 20 26 34 26" stroke="#5D7946" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M12 24 C14 18 20 18 20 22 C20 26 15 27 12 24 Z" fill="#7A9961" />
                    <circle cx="10" cy="30" r="3.5" fill="#FFFDF9" stroke="#5D7946" strokeWidth="1" />
                    <circle cx="10" cy="30" r="1.5" fill="#5D7946" />
                  </svg>
                </div>

                {/* Flowery Side Leaves (Left) */}
                <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 pointer-events-none text-[#5D7946] text-xs">
                  <span className="block transform -rotate-45">🌿</span>
                </div>

                {/* Flowery Side Leaves (Right) */}
                <div className="absolute top-1/2 -right-3.5 -translate-y-1/2 pointer-events-none text-[#5D7946] text-xs">
                  <span className="block transform rotate-45 -scale-x-100">🌿</span>
                </div>
              </div>
            </div>
          </div>

          {/* The Couple Names & Lineage */}
          <div className="space-y-2 sm:space-y-3 max-w-xl mx-auto px-1">
            {/* Groom */}
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="font-wedding italic font-semibold text-3xl xs:text-4xl sm:text-6xl lg:text-7xl gold-gradient-text tracking-wide leading-[1.15] drop-shadow-xs break-words">
                {config.partner1 || 'Tinashey Mutandwa'}
              </h1>
              {config.partner1Title ? (
                <p className="font-serif-luxury italic text-xs sm:text-sm text-[#545E46] tracking-wider">
                  {config.partner1Title}
                </p>
              ) : null}
            </div>

            {/* Ornamental Script Ampersand */}
            <div className="py-0.5">
              <span className="font-wedding italic font-normal text-3xl sm:text-5xl text-[#545E46] block leading-none select-none">
                &
              </span>
            </div>

            {/* Bride */}
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="font-wedding italic font-semibold text-3xl xs:text-4xl sm:text-6xl lg:text-7xl gold-gradient-text tracking-wide leading-[1.15] drop-shadow-xs break-words">
                {config.partner2 || 'Samukelisiwe Sibanda'}
              </h1>
              {config.partner2Title ? (
                <p className="font-serif-luxury italic text-xs sm:text-sm text-[#545E46] tracking-wider">
                  {config.partner2Title}
                </p>
              ) : null}
            </div>
          </div>

          {/* Delicate Filigree Divider in Olive Green & Cream */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 max-w-xs mx-auto py-0.5">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#545E46]/40 to-transparent" />
            <span className="text-[#545E46] text-sm font-serif">❦</span>
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#545E46]/40 to-transparent" />
          </div>

          {/* Hosting Words */}
          <div className="max-w-lg mx-auto px-2">
            <p className="font-serif-luxury italic text-base sm:text-xl text-[#364429] leading-relaxed font-normal">
              “Joyfully invite you to celebrate our union in marriage”
            </p>
          </div>

          {/* Date without Time as specifically requested */}
          <div className="space-y-1 max-w-md mx-auto py-1">
            <p className="font-cinzel text-xl sm:text-3xl text-[#1E2817] font-bold tracking-wider sm:tracking-widest uppercase">
              Monday, 21 December 2026
            </p>
          </div>

          {/* Venue & Location - Life Celebrations Center (851 Goodhope Road) */}
          <div className="max-w-lg mx-auto my-2 sm:my-3">
            <div className="p-4 sm:p-6 bg-gradient-to-b from-[#FAF5EA] via-[#EFE7D8] to-[#E3D6BF] border-2 border-[#545E46]/40 rounded-2xl shadow-md text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#545E46] to-transparent" />

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5DAC4] border border-[#C7B99D] text-[#24301C] font-cinzel text-[10px] tracking-widest uppercase mb-2.5 font-semibold">
                <svg className="w-3.5 h-3.5 text-[#545E46]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>Wedding Venue & Celebration</span>
              </div>

              <h2 className="font-cinzel text-2xl sm:text-3xl text-[#1E2817] font-bold tracking-wider uppercase">
                {config.venueName}
              </h2>

              <p className="font-serif-luxury text-sm sm:text-base text-[#38432D] mt-1.5 font-semibold tracking-wide">
                {config.venueAddress}
              </p>

              <p className="font-serif-luxury italic text-xs sm:text-sm text-[#545E46] mt-1">
                Goodhope · Harare, Zimbabwe
              </p>

              <div className="pt-4 flex items-center justify-center">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${config.venueName}, ${config.venueAddress}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-7 py-3 btn-olive-luxury font-cinzel text-xs font-bold tracking-widest uppercase rounded-full cursor-pointer shadow-md"
                >
                  <svg className="w-4 h-4 text-[#FDFBF7] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>Open in Google Maps ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Clean Essential Details: Attire & Special Instructions in Olive Green & Cream */}
          <div className="border-t border-[#C7B99D]/70 pt-5 sm:pt-6 max-w-md mx-auto space-y-3.5">
            {/* Attire & Fabric Color Shades Card */}
            <div className="p-3.5 bg-[#F5EEDB] border border-[#C7B99D] rounded-2xl shadow-sm text-left">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Small Clean Visible Silk Palette Thumbnail */}
                <button
                  type="button"
                  onClick={() => setIsPaletteModalOpen(true)}
                  className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden shrink-0 border-2 border-[#545E46]/40 shadow-xs relative cursor-pointer group/swatch bg-[#E5DAC4] focus:outline-none"
                  title="Click to view fabric shades"
                  aria-label="View attire color shades"
                >
                  <img
                    src="/assets/images/attire_palette.jpg"
                    alt="Olive Green and Cream Silk Fabric Shades"
                    className="w-full h-full object-cover group-hover/swatch:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] bg-black/60 text-white font-sans font-bold leading-none">
                    Zoom
                  </span>
                </button>

                {/* Color Shade Info & Swatches */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-cinzel uppercase text-[9px] sm:text-[10px] tracking-[0.25em] text-[#545E46] font-bold block">
                      Wedding Attire
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPaletteModalOpen(true)}
                      className="font-serif-luxury text-[10px] sm:text-[11px] text-[#545E46] hover:text-[#24301C] underline cursor-pointer"
                    >
                      View Swatches ↗
                    </button>
                  </div>

                  <p className="text-[#24301C] text-xs sm:text-sm font-semibold truncate">
                    {config.attire}
                  </p>

                  {/* Clean Visual Swatch Dots */}
                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[#FAF5EA] px-2.5 py-1 rounded-full border border-[#D5C7AD] shadow-2xs">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#545E46] border border-white/60 shadow-xs shrink-0" />
                      <span className="text-[10px] font-medium text-[#2E3A24]">Olive Green</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#FAF5EA] px-2.5 py-1 rounded-full border border-[#D5C7AD] shadow-2xs">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#E8DEC6] border border-[#C7B99D] shadow-xs shrink-0" />
                      <span className="text-[10px] font-medium text-[#2E3A24]">Cream</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Instructions Card */}
            <div className="p-3 bg-[#F5EEDB] border border-[#C7B99D] rounded-xl shadow-xs text-center">
              <span className="font-cinzel uppercase text-[9px] sm:text-[10px] tracking-[0.2em] text-[#545E46] block mb-0.5 font-bold">
                Special Instruction
              </span>
              <p className="text-[#24301C] text-xs sm:text-sm font-semibold">
                {config.specialInstructions}
              </p>
            </div>

            {/* RSVP Deadline */}
            <p className="font-serif-luxury italic text-xs sm:text-sm text-[#545E46] pt-1 font-medium">
              Kindly RSVP by the first week of December (7 December 2026)
            </p>
          </div>

          {/* Dynamic Countdown Timer showing Days Remaining */}
          <CountdownTimer targetDate={config.weddingDate} />

          {/* RSVP / Pass Action */}
          <div className="pt-2 sm:pt-3">
            {activeGuest && activeGuest.rsvpStatus === 'accepted' ? (
              <div className="space-y-3 bg-[#F5EEDB] border border-[#545E46]/50 rounded-2xl p-4 sm:p-5 max-w-md mx-auto shadow-md">
                <p className="font-serif-luxury text-sm sm:text-base text-[#24301C]">
                  Welcome, <strong className="text-[#24301C] font-bold">{activeGuest.name}</strong>
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF5EA] border border-[#C7B99D] rounded-full text-xs font-serif-luxury text-[#2E3A24] font-semibold">
                  <span>✓ Attendance Confirmed</span>
                  <span>·</span>
                  <span>{activeGuest.confirmedHeadcount} {activeGuest.confirmedHeadcount > 1 ? 'Guests' : 'Guest'}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2">
                  <button
                    onClick={onOpenPass}
                    className="w-full sm:w-auto px-6 py-3 btn-olive-luxury font-cinzel text-xs font-bold tracking-widest uppercase rounded-full cursor-pointer shadow-md"
                  >
                    View 4-Digit Gate Pass →
                  </button>
                  {activeGuest.inviteType !== 'individual' && (
                    <button
                      onClick={onOpenRSVP}
                      className="text-xs text-[#545E46] hover:text-[#24301C] underline cursor-pointer font-serif-luxury py-1"
                    >
                      Update Response
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenRSVP}
                className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 btn-olive-luxury font-cinzel text-xs sm:text-sm font-bold tracking-[0.2em] uppercase rounded-full cursor-pointer shadow-lg"
              >
                RSVP to Attend
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox Modal for Full Silk Fabric Shades Inspection */}
      {isPaletteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPaletteModalOpen(false)}
        >
          <div
            className="bg-[#FAF5EA] border-2 border-[#545E46] rounded-2xl max-w-xs sm:max-w-sm w-full p-4 space-y-3 shadow-2xl relative text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#D5C7AD]">
              <div className="text-left">
                <span className="font-cinzel text-[9px] uppercase tracking-[0.2em] text-[#545E46] font-bold block">
                  Wedding Attire Palette
                </span>
                <p className="font-serif-luxury text-sm text-[#24301C] font-semibold">
                  Olive Green & Cream Fabric Shades
                </p>
              </div>
              <button
                onClick={() => setIsPaletteModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#E5DAC4] hover:bg-[#D4C5A9] text-[#24301C] flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-[#545E46]/30 shadow-md aspect-[3/4] bg-[#E5DAC4]">
              <img
                src="/assets/images/attire_palette.jpg"
                alt="Olive Green & Cream Silk Fabric Combo"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 bg-[#EFE7D8] px-3 py-1.5 rounded-full border border-[#C7B99D]">
                <span className="w-4 h-4 rounded-full bg-[#545E46] border border-white/60 shadow-xs" />
                <span className="text-xs font-medium text-[#26331C]">Olive Green</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#EFE7D8] px-3 py-1.5 rounded-full border border-[#C7B99D]">
                <span className="w-4 h-4 rounded-full bg-[#E8DEC6] border border-[#C7B99D] shadow-xs" />
                <span className="text-xs font-medium text-[#26331C]">Cream</span>
              </div>
            </div>

            <p className="font-serif-luxury italic text-[11px] text-[#545E46]">
              Guests are cordially invited to dress in shades of olive green and silk cream formal attire.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
