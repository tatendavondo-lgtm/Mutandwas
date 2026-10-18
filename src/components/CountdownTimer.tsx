import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
}

interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeRemaining(target: string): TimeRemaining {
  const targetTime = new Date(target).getTime();
  const now = new Date().getTime();
  const total = Math.max(0, targetTime - now);

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds };
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="bg-[#F5EEDB] border border-[#C7B99D] rounded-2xl p-4 sm:p-6 max-w-md mx-auto space-y-3.5 shadow-sm">
      {/* Urgency Badge Header */}
      <div className="flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#545E46] animate-ping" />
        <p className="font-cinzel uppercase text-[10px] sm:text-[11px] tracking-[0.25em] text-[#333C29] font-bold">
          Days Remaining Until The Union
        </p>
      </div>

      {/* Countdown Grid (Prominently highlighting Days) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {/* Days - Highlighted with Olive & Cream Silk */}
        <div className="bg-[#FAF5EA] border-2 border-[#545E46] rounded-xl py-2 sm:py-3 px-1 text-center shadow-xs relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#545E46] to-transparent" />
          <span className="font-cinzel text-2xl sm:text-4xl font-bold gold-gradient-text tabular-nums block leading-none">
            {timeLeft.days}
          </span>
          <span className="font-cinzel text-[8px] sm:text-[10px] uppercase tracking-wider text-[#333C29] block mt-1 font-bold">
            Days
          </span>
        </div>

        {/* Hours */}
        <div className="bg-[#EFE7D8] border border-[#C7B99D] rounded-xl py-2 sm:py-3 px-1 text-center shadow-xs">
          <span className="font-cinzel text-xl sm:text-3xl font-semibold text-[#24301C] tabular-nums block leading-none">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="font-cinzel text-[8px] sm:text-[10px] uppercase tracking-wider text-[#545E46] block mt-1 font-medium">
            Hours
          </span>
        </div>

        {/* Minutes */}
        <div className="bg-[#EFE7D8] border border-[#C7B99D] rounded-xl py-2 sm:py-3 px-1 text-center shadow-xs">
          <span className="font-cinzel text-xl sm:text-3xl font-semibold text-[#24301C] tabular-nums block leading-none">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="font-cinzel text-[8px] sm:text-[10px] uppercase tracking-wider text-[#545E46] block mt-1 font-medium">
            Mins
          </span>
        </div>

        {/* Seconds */}
        <div className="bg-[#EFE7D8] border border-[#C7B99D] rounded-xl py-2 sm:py-3 px-1 text-center shadow-xs">
          <span className="font-cinzel text-xl sm:text-3xl font-semibold text-[#24301C] tabular-nums block leading-none">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="font-cinzel text-[8px] sm:text-[10px] uppercase tracking-wider text-[#545E46] block mt-1 font-medium">
            Secs
          </span>
        </div>
      </div>

      {/* Urgency Callout Caption */}
      <p className="font-serif-luxury italic text-xs text-[#5D704E] text-center leading-relaxed">
        ✦ Only <strong className="text-[#202C1B] font-bold not-italic font-cinzel">{timeLeft.days} days</strong> remaining to confirm your attendance and secure your reception seat ✦
      </p>
    </div>
  );
};
