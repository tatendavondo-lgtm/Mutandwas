import React, { useState, useEffect } from 'react';
import { Guest, WeddingConfig } from '../types/wedding';
import { scanGuestTicket, ScanResult } from '../services/weddingStorage';
import { playSuccessChime, playErrorBuzzer } from '../utils/audio';

interface GateScannerProps {
  config: WeddingConfig;
  allGuests: Guest[];
  isUnlocked: boolean;
  onSetUnlocked: (unlocked: boolean) => void;
  onGuestUpdated: () => void;
}

export const GateScanner: React.FC<GateScannerProps> = ({
  config,
  allGuests,
  isUnlocked,
  onSetUnlocked,
  onGuestUpdated,
}) => {
  // Staff PIN lock state
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // 4-Digit Input state
  const [passCodeInput, setPassCodeInput] = useState('');
  const [activeGate, setActiveGate] = useState('Gletwyn Main Gate 1');
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [shiftScansCount, setShiftScansCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Search Fallback state (if guest forgot their 4-digit code)
  const [guestSearch, setGuestSearch] = useState('');

  // Venue Capacity
  const checkedInGuests = allGuests.filter((g) => g.checkInStatus === 'checked_in');
  const totalCheckedInHeadcount = checkedInGuests.reduce(
    (sum, g) => sum + (g.confirmedHeadcount || g.partySize || 1),
    0
  );
  const capacityPercent = Math.min(
    100,
    Math.round((totalCheckedInHeadcount / config.venueCapacity) * 100)
  );

  // Process 4-digit pass code against live Supabase database
  const handleProcessCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || isVerifying) return;

    setIsVerifying(true);
    setPassCodeInput('');

    try {
      const result = await scanGuestTicket(trimmed, activeGate);
      setLastScanResult(result);
      setIsResultModalOpen(true);

      if (result.success) {
        playSuccessChime();
        setShiftScansCount((prev) => prev + 1);
      } else {
        playErrorBuzzer();
      }
      onGuestUpdated();
    } finally {
      setIsVerifying(false);
    }
  };

  // On-screen keypad button click
  const handleKeypadPress = (val: string) => {
    if (passCodeInput.length >= 4 || isVerifying) return;
    const nextCode = passCodeInput + val;
    setPassCodeInput(nextCode);

    // Auto-verify when 4th digit is tapped
    if (nextCode.length === 4) {
      void handleProcessCode(nextCode);
    }
  };

  const handleKeypadBackspace = () => {
    setPassCodeInput((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPassCodeInput('');
  };

  // Keyboard listener for physical keyboard typing
  useEffect(() => {
    if (!isUnlocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a search box
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isVerifying) return;

      if (isResultModalOpen) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsResultModalOpen(false);
          return;
        }
        if (/^[0-9]$/.test(e.key)) {
          setIsResultModalOpen(false);
          setPassCodeInput(e.key);
          return;
        }
      }

      if (/^[0-9]$/.test(e.key)) {
        if (passCodeInput.length < 4) {
          const next = passCodeInput + e.key;
          setPassCodeInput(next);
          if (next.length === 4) {
            void handleProcessCode(next);
          }
        }
      } else if (e.key === 'Backspace') {
        setPassCodeInput((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setPassCodeInput('');
      } else if (e.key === 'Enter') {
        if (passCodeInput.length > 0) {
          void handleProcessCode(passCodeInput);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnlocked, passCodeInput, activeGate, isVerifying, isResultModalOpen]);

  // PIN Unlock submission
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === config.gatePin) {
      onSetUnlocked(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Incorrect Security PIN. Access denied.');
      playErrorBuzzer();
    }
  };

  // LOCKED STATE: PIN Keypad Screen
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-[#10170E] border border-[#A0B98A]/50 rounded-3xl p-8 shadow-2xl text-center space-y-6 text-stone-100 gold-box-glow">
          <div className="w-14 h-14 rounded-2xl bg-[#172214] border border-[#A0B98A]/40 text-[#FAF7F0] flex items-center justify-center mx-auto text-2xl font-bold shadow-md">
            🛡️
          </div>

          <div className="space-y-1">
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-[#FAF7F0] tracking-wider uppercase">
              Gate Security Terminal
            </h2>
            <p className="text-xs font-serif-luxury text-[#EDE0CC]">
              Restricted check-in terminal for venue gatekeepers & security personnel.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="block text-xs font-cinzel text-[#C2D2B2]">
                Enter Security PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 bg-[#162214] border border-[#A0B98A]/40 rounded-xl focus:outline-none focus:border-[#C2D2B2] text-white"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-400 font-medium text-center">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 btn-cream-luxury text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg font-cinzel"
            >
              Unlock Gate Terminal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filtered guests for emergency name search
  const filteredSearchGuests = guestSearch.trim()
    ? allGuests.filter(
        (g) =>
          g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
          g.ticketCode.includes(guestSearch)
      )
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 bg-[#FBF9F5] text-stone-900 rounded-3xl shadow-2xl border border-stone-200">
      {/* Top Header & Gate Selector */}
      <div className="bg-white border border-stone-200 shadow-md rounded-2xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-widest text-[#4D633E] font-cinzel font-bold">
              Live Express Gate Terminal
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Life Celebrations Center Check-In
          </h1>
          <p className="text-xs text-stone-600">
            Instant 4-digit code check-in · Anti-passback duplicate rejection
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeGate}
            onChange={(e) => setActiveGate(e.target.value)}
            className="bg-white border border-stone-300 text-stone-800 rounded-xl px-3 py-2 shadow-sm text-xs font-cinzel focus:outline-none cursor-pointer"
          >
            <option value="Main Gate - Goodhope Road">Main Gate - Goodhope Road</option>
            <option value="West Pavilion Gate">West Pavilion Gate</option>
            <option value="VIP & Valet Arrival Gate">VIP & Valet Arrival Gate</option>
          </select>

          <button
            onClick={() => onSetUnlocked(false)}
            className="px-3.5 py-2 bg-stone-200 hover:bg-stone-300 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 transition-colors cursor-pointer"
          >
            Lock Terminal
          </button>
        </div>
      </div>

      {/* Real-time Venue Capacity Gauge Strip */}
      <div className="bg-white border border-stone-200 shadow-md rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider text-[#5D704E] font-cinzel font-semibold">
              Live Venue Attendance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-stone-900 tabular-nums">
                {totalCheckedInHeadcount}
              </span>
              <span className="text-xs text-stone-500">
                admitted of {config.venueCapacity} max permitted capacity
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`font-mono text-xl sm:text-2xl font-bold tabular-nums ${
                capacityPercent >= 90
                  ? 'text-rose-400'
                  : capacityPercent >= 75
                  ? 'text-amber-400'
                  : 'text-emerald-500'
              }`}
            >
              {capacityPercent}%
            </span>
            <span className="block text-[11px] text-stone-500">Occupancy</span>
          </div>
        </div>

        <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden border border-stone-300">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              capacityPercent >= 90
                ? 'bg-rose-500'
                : capacityPercent >= 75
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
      </div>

      {/* Centered Rapid 4-Digit Numpad Terminal */}
      <div className="max-w-lg mx-auto bg-white border border-stone-200 shadow-lg rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-cinzel text-base sm:text-lg font-bold text-stone-900 uppercase tracking-wider">
            Enter 4-Digit Pass Code
          </h2>
          <span className="text-[11px] font-mono text-[#5D704E] font-bold">
            Shift Scans: <strong className="text-stone-900">{shiftScansCount}</strong>
          </span>
        </div>

        {/* 4-Digit Slots Display */}
        <div className="bg-[#121A0F] border-2 border-[#5D704E]/50 rounded-2xl p-4 py-5 flex items-center justify-center gap-3 shadow-inner">
          {[0, 1, 2, 3].map((slotIdx) => {
            const digit = passCodeInput[slotIdx] || '';
            return (
              <div
                key={slotIdx}
                className={`w-12 h-16 sm:w-14 sm:h-18 rounded-xl border-2 flex items-center justify-center transition-all ${
                  digit
                    ? 'border-[#A0B98A] bg-[#1E2C1A] text-[#FAF7F0] shadow-md'
                    : 'border-[#3D4C33] bg-[#0C120A] text-[#A0B98A]/60'
                }`}
              >
                <span className="font-mono text-3xl sm:text-4xl font-extrabold gold-gradient-text">
                  {digit || '—'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Touch-Friendly Numeric Keypad for Security Staff */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadPress(num)}
              className="py-3.5 sm:py-4 bg-white hover:bg-stone-100 border-2 border-stone-200 text-stone-900 font-bold shadow-sm active:bg-[#A0B98A] active:text-[#121A0F] hover:border-[#5D704E]/60 rounded-xl text-xl sm:text-2xl font-mono transition-all cursor-pointer shadow-md"
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleKeypadClear}
            className="py-3.5 sm:py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 font-bold rounded-xl text-xs sm:text-sm font-cinzel tracking-wider transition-colors cursor-pointer"
          >
            CLEAR
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="py-3.5 sm:py-4 bg-white hover:bg-stone-100 border-2 border-stone-200 text-stone-900 font-bold shadow-sm active:bg-[#A0B98A] active:text-[#121A0F] hover:border-[#5D704E]/60 rounded-xl text-xl sm:text-2xl font-mono transition-all cursor-pointer shadow-md"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleKeypadBackspace}
            className="py-3.5 sm:py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 font-bold rounded-xl text-lg transition-colors cursor-pointer"
            title="Backspace"
          >
            ⌫
          </button>
        </div>

        {/* Manual Input Trigger */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void handleProcessCode(passCodeInput)}
            disabled={passCodeInput.length === 0 || isVerifying}
            className="w-full py-3 btn-cream-luxury disabled:opacity-40 font-cinzel text-xs font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer shadow-md"
          >
            {isVerifying ? 'Verifying with Database...' : 'Verify Pass Code →'}
          </button>
        </div>

        {/* Emergency Fallback: Search by Guest Name */}
        <div className="pt-3 border-t border-stone-200 space-y-2">
          <label className="block text-[11px] font-cinzel text-[#5D704E] font-bold">
            Forgot Code? Search Guest by Name
          </label>
          <input
            type="text"
            value={guestSearch}
            onChange={(e) => setGuestSearch(e.target.value)}
            placeholder="e.g. Farai Matiza..."
            className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#5D704E]"
          />

          {filteredSearchGuests.length > 0 && (
            <div className="bg-stone-50 border border-stone-300 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
              {filteredSearchGuests.map((g) => {
                const isAlreadyChecked = g.checkInStatus === 'checked_in';
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      void handleProcessCode(g.ticketCode);
                      setGuestSearch('');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-xs flex items-center justify-between text-stone-900 cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold block text-stone-900">{g.name}</span>
                      <span className="text-[10px] text-stone-600">
                        Code: {g.ticketCode} · {g.confirmedHeadcount || g.partySize} seats
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isAlreadyChecked
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-[#5D704E] text-[#FAF7F0]'
                      }`}
                    >
                      {isAlreadyChecked ? 'Used / Checked In' : 'Admit →'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Instant Verification Result Pop-Up Modal (No Scrolling Required) */}
      {isResultModalOpen && lastScanResult && (
        <div
          onClick={() => setIsResultModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md safe-pb safe-pt"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl p-6 sm:p-7 border-2 shadow-2xl transition-all ${
              lastScanResult.success
                ? 'bg-[#0E1E14] border-emerald-500 text-emerald-100'
                : 'bg-[#220E12] border-rose-500 text-rose-100'
            }`}
          >
            {/* Result Status Header */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-lg shrink-0 ${
                  lastScanResult.success
                    ? 'bg-emerald-500 text-black'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {lastScanResult.success ? '✓' : '!'}
              </div>
              <div>
                <h3 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-wider leading-tight">
                  {lastScanResult.success ? 'ENTRY APPROVED' : 'ACCESS DENIED'}
                </h3>
                <span className="text-xs font-mono font-semibold opacity-90 block mt-0.5">
                  {lastScanResult.success
                    ? '4-Digit Pass Code Verified & Admitted'
                    : lastScanResult.reason === 'ALREADY_SCANNED'
                    ? 'DUPLICATE CODE PREVENTED'
                    : 'INVALID PASS CODE'}
                </span>
              </div>
            </div>

            {/* Duplicate Warning Box */}
            {lastScanResult.reason === 'ALREADY_SCANNED' && lastScanResult.previousCheckIn && (
              <div className="bg-rose-950/90 border border-rose-500/70 p-4 rounded-2xl mb-4 text-xs text-rose-100 space-y-1.5">
                <p className="font-bold text-rose-300 text-sm">
                  ⚠️ DUPLICATE SCAN (CODE ALREADY USED)
                </p>
                <p>
                  This pass code was already checked in at{' '}
                  <strong className="text-white underline">{lastScanResult.previousCheckIn.time}</strong> by{' '}
                  <strong className="text-white underline">{lastScanResult.previousCheckIn.gate}</strong>.
                </p>
                <p className="text-[11px] text-rose-300 pt-0.5 font-semibold">
                  Entry refused. Each 4-digit pass code is valid for one check-in only.
                </p>
              </div>
            )}

            {/* Guest Details Card if found */}
            {lastScanResult.guest && (
              <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 text-xs space-y-3 text-stone-800 shadow-inner">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#4D633E] font-cinzel font-bold block">
                      Guest Name
                    </span>
                    <strong className="text-xl text-stone-900 font-serif-luxury block leading-snug">
                      {lastScanResult.guest.name}
                    </strong>
                    {lastScanResult.guest.plusOneName && (
                      <p className="text-xs text-stone-600 mt-0.5">
                        Note / Family: <span className="text-stone-900 font-semibold">{lastScanResult.guest.plusOneName}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-[#4D633E] block">
                      Code: {lastScanResult.guest.ticketCode}
                    </span>
                    {lastScanResult.guest.isVIP && (
                      <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold mt-1">
                        VIP GUEST
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-200">
                  <div className="bg-stone-100 rounded-xl p-2.5 text-center border border-stone-200">
                    <span className="text-[10px] uppercase text-stone-500 block font-mono">
                      Admitted Headcount
                    </span>
                    <strong className="text-stone-900 text-base sm:text-lg font-bold block mt-0.5">
                      {lastScanResult.guest.confirmedHeadcount || lastScanResult.guest.partySize}{' '}
                      {(lastScanResult.guest.confirmedHeadcount || lastScanResult.guest.partySize) === 1
                        ? 'Guest'
                        : 'Guests'}
                    </strong>
                  </div>

                  <div className="bg-stone-100 rounded-xl p-2.5 text-center border border-stone-200">
                    <span className="text-[10px] uppercase text-stone-500 block font-mono">
                      Dietary Requirement
                    </span>
                    <span className="text-stone-900 font-semibold truncate block mt-1">
                      {lastScanResult.guest.dietaryRequirements || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs mt-4 leading-relaxed font-medium text-center opacity-95">
              {lastScanResult.message}
            </p>

            {/* Primary Dismiss Action Button */}
            <button
              type="button"
              onClick={() => setIsResultModalOpen(false)}
              className={`w-full mt-5 py-3.5 rounded-2xl font-cinzel text-xs sm:text-sm font-bold uppercase tracking-widest shadow-lg transition-all cursor-pointer ${
                lastScanResult.success
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              {lastScanResult.success ? '✓ Scan Next Guest' : 'Dismiss & Try Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
