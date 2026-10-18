import React from 'react';
import { WeddingConfig } from '../types/wedding';

interface EventMapProps {
  config: WeddingConfig;
}

export const EventMap: React.FC<EventMapProps> = ({ config }) => {
  const googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    `${config.venueName}, ${config.venueAddress}`
  )}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16 text-[#24301C] flex flex-col items-center justify-center">
      {/* Royal Venue Card - Authentic Silk Cream & Olive */}
      <div className="w-full bg-gradient-to-b from-[#FAF5EA] via-[#EFE7D8] to-[#E3D6BF] border-2 border-[#545E46]/50 rounded-3xl p-6 sm:p-12 text-center shadow-xl relative overflow-hidden gold-box-glow space-y-6 sm:space-y-8">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#545E46] to-transparent" />

        {/* Inner Silk Cream Border */}
        <div className="absolute inset-2.5 sm:inset-4 border border-[#C7B99D] rounded-2xl pointer-events-none" />

        {/* Monogram Crest */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#545E46] bg-gradient-to-b from-[#F7F2E6] to-[#E5DAC4] mx-auto flex items-center justify-center shadow-md">
          <span className="font-wedding text-2xl sm:text-3xl text-[#26331C] pt-0.5 font-bold">T&S</span>
        </div>

        <div className="space-y-3">
          <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#545E46] font-bold">
            Wedding Celebration Venue
          </p>
          <h1 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1E2817] tracking-wide">
            {config.venueName}
          </h1>
          <p className="font-serif-luxury text-base sm:text-lg text-[#3B462F] max-w-md mx-auto font-semibold">
            {config.venueAddress}
          </p>
          <p className="font-serif-luxury italic text-xs sm:text-sm text-[#545E46] font-medium">
            Goodhope · Harare, Zimbabwe
          </p>
        </div>

        {/* Highly Visible Google Maps Button in Olive Luxury */}
        <div className="pt-2 sm:pt-4">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-4 sm:py-5 btn-olive-luxury font-cinzel text-sm sm:text-base font-bold tracking-[0.2em] uppercase rounded-full shadow-lg transition-all cursor-pointer"
          >
            <svg className="w-5 h-5 text-[#FAF7F0] shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span>Open in Google Maps ↗</span>
          </a>
        </div>

        <p className="text-xs text-[#5D704E] font-serif-luxury pt-1 font-medium">
          Tap the button above for instant turn-by-turn driving directions on your phone.
        </p>
      </div>
    </div>
  );
};
