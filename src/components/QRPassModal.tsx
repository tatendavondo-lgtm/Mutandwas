import React, { useState } from 'react';
import QRCode from 'qrcode';
import { Guest, WeddingConfig } from '../types/wedding';

interface QRPassModalProps {
  guest: Guest | null;
  config: WeddingConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const QRPassModal: React.FC<QRPassModalProps> = ({
  guest,
  config,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQrBackup, setShowQrBackup] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  React.useEffect(() => {
    if (!guest) return;
    const cleanCode = guest.ticketCode.replace(/\D/g, '') || guest.ticketCode;

    QRCode.toDataURL(
      cleanCode,
      {
        width: 240,
        margin: 2,
        color: {
          dark: '#141D12',
          light: '#FDFBF7',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [guest]);

  if (!isOpen || !guest) return null;

  const isCheckedIn = guest.checkInStatus === 'checked_in';
  const cleanCode = guest.ticketCode.replace(/\D/g, '') || guest.ticketCode;
  const digits = cleanCode.padStart(4, '0').slice(-4).split('');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-sm overflow-y-auto safe-pb safe-pt">
      <div className="bg-[#FFFDF9] border-2 border-[#BACBB0] rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full overflow-hidden my-auto max-h-[94dvh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200 text-[#202C1B] gold-box-glow">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-[#F2F6ED] hover:bg-[#E5EDDC] text-[#3B4D2B] flex items-center justify-center text-sm cursor-pointer transition-colors no-print border border-[#BACBB0]"
          aria-label="Close pass modal"
        >
          ✕
        </button>

        {/* Top Gala Header Strip in Light Silk Cream & Olive */}
        <div className="bg-gradient-to-b from-[#FAF8F5] to-[#F5EFE6] border-b border-[#BACBB0] text-[#202C1B] p-6 pb-5 text-center space-y-1 relative">
          <div className="inline-block border border-[#BACBB0] bg-[#EAF0E4] px-3 py-0.5 rounded-full text-[10px] uppercase tracking-[0.25em] text-[#2B3B22] font-cinzel mb-1 font-bold">
            Official Gate Pass
          </div>
          <h3 className="font-wedding text-3xl sm:text-4xl font-bold text-[#1D2615]">
            {config.coupleNames}
          </h3>
          <p className="font-cinzel text-xs text-[#5D704E] tracking-wider font-semibold">
            {config.venueName} · Goodhope
          </p>
        </div>

        {/* Ticket Perforation Graphic */}
        <div className="relative bg-[#F5EFE6] pb-3">
          <div className="flex items-center justify-between px-2">
            <div className="w-5 h-5 rounded-full bg-[#FFFDF9] -ml-5.5 border-r border-[#BACBB0]" />
            <div className="border-b border-dashed border-[#BACBB0] w-full mx-2" />
            <div className="w-5 h-5 rounded-full bg-[#FFFDF9] -mr-5.5 border-l border-[#BACBB0]" />
          </div>
        </div>

        {/* Pass Body Content */}
        <div className="p-5 sm:p-6 pt-2 space-y-4 sm:space-y-5">
          {/* Guest Callout */}
          <div className="bg-[#FAF8F5] border border-[#BACBB0] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#5D704E] font-mono block font-bold">
                  Guest of Honour
                </span>
                <h4 className="font-serif text-xl sm:text-2xl font-bold text-[#1D2615] leading-tight">
                  {guest.name}
                </h4>
                {guest.plusOneName && (
                  <p className="text-xs text-[#5D704E] mt-0.5">
                    with guest: <span className="font-semibold text-[#1D2615]">{guest.plusOneName}</span>
                  </p>
                )}
              </div>

              {guest.isVIP && (
                <span className="bg-[#EAF0E4] text-[#2B3B22] border border-[#BACBB0] px-2.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-bold">
                  VIP Guest
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#BACBB0]/50 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#5D704E] block font-mono font-bold">
                  Admitted Capacity
                </span>
                <span className="font-bold text-[#1D2615] block">
                  {guest.confirmedHeadcount || guest.partySize} {guest.confirmedHeadcount > 1 ? 'Seats' : 'Seat'} Reserved
                </span>
                <span className="text-[11px] text-[#5D704E] block font-medium">
                  Adults Only
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#5D704E] block font-mono font-bold">
                  Dietary Request
                </span>
                <span className="font-bold text-[#1D2615] block truncate">
                  {guest.dietaryRequirements}
                </span>
                <span className="text-[11px] text-[#5D704E] block font-medium">
                  Wedding Banquet
                </span>
              </div>
            </div>
          </div>

          {/* 4-Digit Pass Code Hero Card in Olive Green & Silk Cream */}
          <div className="bg-gradient-to-b from-[#FFFFFF] to-[#FAF8F5] border-2 border-[#A0B98A] rounded-2xl p-5 text-center shadow-md space-y-3">
            <span className="font-cinzel text-[11px] uppercase tracking-[0.25em] text-[#3B4D2B] font-bold block">
              Express Gate Entry Code
            </span>

            {/* Stylized 4 Digit Tiles */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-1">
              {digits.map((digit, idx) => (
                <div
                  key={idx}
                  className="w-13 h-16 sm:w-15 sm:h-18 bg-[#F4F8EF] border-2 border-[#7A9961] rounded-xl flex items-center justify-center shadow-xs relative overflow-hidden"
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#7A9961] to-transparent" />
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold gold-gradient-text tracking-wider select-all">
                    {digit}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#5D704E] font-serif-luxury max-w-xs mx-auto font-medium">
              Tell or show this <strong className="text-[#1D2615] font-bold">4-digit code</strong> to the security gatekeeper for rapid check-in at the gate.
            </p>

            <div className="flex items-center justify-center gap-2 pt-1 no-print">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-1.5 bg-[#EAF0E4] hover:bg-[#DFE7D6] border border-[#BACBB0] rounded-full text-xs font-mono text-[#202C1B] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{copied ? '✓' : '📋'}</span>
                <span>{copied ? 'Copied to Clipboard' : `Copy Code (${cleanCode})`}</span>
              </button>
            </div>

            {/* Check-in Status Banner */}
            <div
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mt-2 ${
                isCheckedIn
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-[#EAF0E4] text-[#2B3B22] border border-[#BACBB0]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-500' : 'bg-[#5D7946] animate-pulse'}`} />
              <span>
                {isCheckedIn
                  ? `Checked In at ${guest.checkInTime ? new Date(guest.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} (${guest.checkedInBy || 'Gate'})`
                  : 'Valid For Single-Use Gate Entry'}
              </span>
            </div>
          </div>

          {/* Optional QR Code Drawer (Backup) */}
          <div className="text-center no-print">
            <button
              type="button"
              onClick={() => setShowQrBackup(!showQrBackup)}
              className="text-[11px] text-[#5D704E] hover:text-[#1D2615] underline cursor-pointer font-medium"
            >
              {showQrBackup ? '▲ Hide QR Backup' : '▼ Need QR Backup instead?'}
            </button>

            {showQrBackup && (
              <div className="mt-3 p-3 bg-white border border-[#BACBB0] rounded-xl inline-block shadow-md">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for pass ${cleanCode}`}
                    className="w-36 h-36 object-contain mx-auto"
                  />
                )}
                <span className="font-mono text-xs font-bold text-[#1D2615] block mt-1">Code: {cleanCode}</span>
              </div>
            )}
          </div>

          {/* Pass Action Buttons */}
          <div className="space-y-2 no-print pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 px-3 bg-[#F2F6ED] hover:bg-[#E5EDDC] text-[#202C1B] text-xs font-bold rounded-xl transition-colors cursor-pointer border border-[#BACBB0] flex items-center justify-center gap-1.5"
              >
                <span>🖨️</span>
                <span>Print / Save PDF</span>
              </button>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(`${config.venueName}, ${config.venueAddress}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 btn-olive-luxury text-xs font-bold rounded-xl transition-all cursor-pointer font-cinzel flex items-center justify-center gap-1.5 text-center shadow-md"
              >
                <span>📍</span>
                <span>Directions to Venue ↗</span>
              </a>
            </div>

            <p className="text-[10px] text-center text-[#5D704E] font-medium">
              Tip: Screenshot this pass or keep this page bookmarked on your phone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
