import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Guest } from '../types/wedding';
import { submitGuestSelfRSVP } from '../services/weddingStorage';

interface RSVPModalProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
  onRSVPSaved: (updatedGuest: Guest) => void;
  onOpenPass: (guest: Guest) => void;
}

const COMMON_DIETARY_OPTIONS = [
  'Standard / None',
  'Vegetarian',
  'Vegan',
  'Halaal',
  'Gluten-Free',
  'No Pork',
  'Nut Allergy',
];

export const RSVPModal: React.FC<RSVPModalProps> = ({
  guest,
  isOpen,
  onClose,
  onRSVPSaved,
  onOpenPass,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined'>('accepted');
  const [dietary, setDietary] = useState<string>('');
  const [songRequest, setSongRequest] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Server-side validation states
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [serverGeneralError, setServerGeneralError] = useState<string>('');
  const [serverValidationSuccess, setServerValidationSuccess] = useState<string>('');

  const initializedModalRef = React.useRef(false);

  useEffect(() => {
    // When the modal closes, reset the flag so next open cleanly populates
    if (!isOpen) {
      initializedModalRef.current = false;
      return;
    }

    // Only populate fields on FIRST opening of modal. Never overwrite while user is typing!
    if (!initializedModalRef.current) {
      initializedModalRef.current = true;

      if (guest) {
        setName(guest.name || '');
        setPhone(guest.phone || '');
        setRsvpStatus(guest.rsvpStatus === 'declined' ? 'declined' : 'accepted');
        setDietary(guest.dietaryRequirements === 'Pending' ? '' : guest.dietaryRequirements || '');
        setSongRequest(guest.songRequest || '');
        setNotes(guest.notes || '');
      } else {
        setName('');
        setPhone('');
        setRsvpStatus('accepted');
        setDietary('');
        setSongRequest('');
        setNotes('');
      }

      // Clear validation messages when modal opens
      setServerErrors({});
      setServerGeneralError('');
      setServerValidationSuccess('');
    }
  }, [isOpen, guest?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErrors({});
    setServerGeneralError('');
    setServerValidationSuccess('');
    setIsSubmitting(true);

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Please provide your full name.';
    }

    if (rsvpStatus === 'accepted') {
      if (!dietary.trim()) {
        errors.dietaryRequirements = 'Please specify dietary requirements (or enter "None").';
      }
    }

    if (Object.keys(errors).length > 0) {
      setServerErrors(errors);
      setServerGeneralError(Object.values(errors)[0]);
      setIsSubmitting(false);
      return;
    }

    try {
      setServerValidationSuccess('Verification complete. Saving response...');

      // Save to database & persistent storage directly
      const fallbackEmail = `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'guest'}@rsvp.wedding`;
      const savedGuest = submitGuestSelfRSVP({
        existingId: guest?.id,
        name: name.trim(),
        email: guest?.email || fallbackEmail,
        phone: phone.trim(),
        rsvpStatus,
        partySize: guest?.partySize || 1,
        confirmedHeadcount: rsvpStatus === 'accepted' ? (guest?.partySize || 1) : 0,
        dietaryRequirements: dietary.trim() || 'None',
        songRequest: songRequest.trim(),
        notes: notes.trim(),
        inviteType: guest?.inviteType || (guest?.inviteCode?.startsWith('pass_') ? 'individual' : 'family'),
      });

      if (rsvpStatus === 'accepted') {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#4B6237', '#FDFBF7', '#EFE6D5', '#7A9961', '#C2D2B2'],
          });
        } catch {
          // ignore
        }
      }

      onRSVPSaved(savedGuest);
      setIsSubmitting(false);
      onClose();

      if (rsvpStatus === 'accepted') {
        onOpenPass(savedGuest);
      }
    } catch (err: any) {
      console.error('RSVP submission error:', err);
      setServerGeneralError('An unexpected error occurred while saving your RSVP. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto safe-pb safe-pt">
      <div className="bg-[#FAF5EA] border-2 border-[#545E46]/60 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-8 my-auto max-h-[92dvh] overflow-y-auto space-y-5 sm:space-y-6 relative text-[#24301C] gold-box-glow">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#EFE7D8] text-[#545E46] hover:text-[#24301C] flex items-center justify-center text-sm cursor-pointer transition-colors border border-[#C7B99D]"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Modal Header with Monogram Touch */}
        <div className="text-center space-y-1">
          <span className="font-wedding text-3xl text-[#545E46] block leading-none font-bold">
            T & S
          </span>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#545E46] font-cinzel font-bold pt-1">
            Wedding RSVP Confirmation
          </p>
          <h2 className="font-wedding italic text-3xl sm:text-4xl font-semibold text-[#24301C] leading-tight">
            Tinashey & Samukelisiwe
          </h2>
          <p className="text-xs font-serif-luxury text-[#545E46] font-medium">
            Life Celebrations Center · Monday, 21 December 2026
          </p>
        </div>

        {/* Single-Use Token Already Used / Locked Notice */}
        {guest && guest.inviteType === 'individual' && guest.rsvpStatus !== 'pending' && (
          <div className="p-4 bg-[#F2F6ED] border border-[#BACBB0] rounded-2xl text-[#202C1B] text-xs space-y-2 text-center animate-in fade-in">
            <span className="text-xl">🔒</span>
            <p className="font-semibold font-cinzel text-[#202C1B] text-sm">
              Single-Use Invitation Already Completed
            </p>
            <p className="text-[#3B4D2B] text-xs">
              This personalized invitation token was already used to register attendance for{' '}
              <strong className="text-[#1D2615] font-bold">{guest.name}</strong> ({guest.confirmedHeadcount} guests). It cannot be reused or transferred.
            </p>
            {guest.rsvpStatus === 'accepted' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPass(guest);
                }}
                className="mt-2 px-5 py-2 btn-olive-luxury font-cinzel text-xs font-bold rounded-full cursor-pointer shadow-md"
              >
                View 4-Digit Gate Pass →
              </button>
            )}
          </div>
        )}

        {/* Validation Alerts */}
        {serverGeneralError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2.5 animate-shake">
            <span className="text-base">⚠️</span>
            <span className="font-medium">{serverGeneralError}</span>
          </div>
        )}

        {serverValidationSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2.5 animate-fade-in">
            <span className="text-base">✓</span>
            <span className="font-medium">{serverValidationSuccess}</span>
          </div>
        )}

        {/* If already used individual invite, hide form to block tampering */}
        {guest && guest.inviteType === 'individual' && guest.rsvpStatus !== 'pending' ? null : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest Identity Fields */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-[#3B4D2B]">
                  Your Full Name *
                </label>
                {serverErrors.name && (
                  <span className="text-[10px] text-rose-500 font-medium">
                    {serverErrors.name}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (serverErrors.name) {
                    setServerErrors((prev) => ({ ...prev, name: '' }));
                  }
                }}
                placeholder=""
                className={`w-full bg-[#FAF8F5] border rounded-xl px-3.5 py-2.5 text-xs text-[#202C1B] placeholder-[#8DA579] focus:outline-none transition-colors ${
                  serverErrors.name
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-[#BACBB0] focus:border-[#4C6239]'
                }`}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-[#3B4D2B]">
                  Phone / WhatsApp Number
                </label>
                {serverErrors.phone && (
                  <span className="text-[10px] text-rose-500 font-medium">
                    Invalid
                  </span>
                )}
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (serverErrors.phone) {
                    setServerErrors((prev) => ({ ...prev, phone: '' }));
                  }
                }}
                placeholder="+263 77 123 4567"
                className={`w-full bg-[#FAF8F5] border rounded-xl px-3.5 py-2.5 text-xs text-[#202C1B] placeholder-[#8DA579] focus:outline-none transition-colors ${
                  serverErrors.phone
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-[#BACBB0] focus:border-[#4C6239]'
                }`}
              />
              {serverErrors.phone && (
                <p className="text-[10px] text-rose-500 mt-1">{serverErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Attendance Choice */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-[#3B4D2B]">
                Attendance Status *
              </label>
              {serverErrors.attendanceStatus && (
                <span className="text-[10px] text-rose-500 font-medium">
                  {serverErrors.attendanceStatus}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRsvpStatus('accepted');
                  if (serverErrors.attendanceStatus) {
                    setServerErrors((prev) => ({ ...prev, attendanceStatus: '' }));
                  }
                }}
                className={`py-3 px-4 rounded-xl border text-xs text-center transition-all cursor-pointer font-bold ${
                  rsvpStatus === 'accepted'
                    ? 'border-2 border-[#4C6239] bg-[#EAF0E4] text-[#1D2615] shadow-sm'
                    : 'border-[#BACBB0] bg-[#FAF8F5] text-stone-600 hover:border-[#7A9961]'
                }`}
              >
                Joyfully Accept
              </button>

              <button
                type="button"
                onClick={() => {
                  setRsvpStatus('declined');
                  if (serverErrors.attendanceStatus) {
                    setServerErrors((prev) => ({ ...prev, attendanceStatus: '' }));
                  }
                }}
                className={`py-3 px-4 rounded-xl border text-xs text-center transition-all cursor-pointer font-bold ${
                  rsvpStatus === 'declined'
                    ? 'border-2 border-stone-400 bg-stone-100 text-stone-800 shadow-sm'
                    : 'border-[#BACBB0] bg-[#FAF8F5] text-stone-600 hover:border-[#7A9961]'
                }`}
              >
                Regretfully Decline
              </button>
            </div>
          </div>

          {rsvpStatus === 'accepted' && (
            <div className="space-y-3.5 pt-1 animate-in fade-in duration-200">


              {/* Dietary Requirements (Required by server) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-[#3B4D2B]">
                    Dietary Requirements * (Required by Server)
                  </label>
                  {serverErrors.dietaryRequirements && (
                    <span className="text-[10px] text-rose-500 font-medium">
                      Required
                    </span>
                  )}
                </div>

                {/* Quick Selection Tags */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {COMMON_DIETARY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setDietary(option);
                        if (serverErrors.dietaryRequirements) {
                          setServerErrors((prev) => ({ ...prev, dietaryRequirements: '' }));
                        }
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        dietary.toLowerCase() === option.toLowerCase()
                          ? 'border-[#4C6239] bg-[#EAF0E4] text-[#1D2615] font-bold'
                          : 'border-[#BACBB0] bg-[#FAF8F5] text-stone-600 hover:text-stone-900 hover:border-[#7A9961]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={dietary}
                  onChange={(e) => {
                    setDietary(e.target.value);
                    if (serverErrors.dietaryRequirements) {
                      setServerErrors((prev) => ({ ...prev, dietaryRequirements: '' }));
                    }
                  }}
                  placeholder="e.g. Vegetarian, Halaal, Gluten-Free, or None"
                  className={`w-full bg-[#FAF8F5] border rounded-xl px-3.5 py-2.5 text-xs text-[#202C1B] placeholder-[#8DA579] focus:outline-none ${
                    serverErrors.dietaryRequirements
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-[#BACBB0] focus:border-[#4C6239]'
                  }`}
                />
                {serverErrors.dietaryRequirements ? (
                  <p className="text-[10px] text-rose-500">{serverErrors.dietaryRequirements}</p>
                ) : (
                  <p className="text-[10px] text-[#5D704E]">
                    Required for reception banquet planning. If no restrictions, choose "Standard / None".
                  </p>
                )}
              </div>

              {/* Song Request */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#3B4D2B]">
                  Song Request for the Reception Dance Floor
                </label>
                <input
                  type="text"
                  value={songRequest}
                  onChange={(e) => setSongRequest(e.target.value)}
                  placeholder="e.g. Jerusalema - Master KG"
                  className="w-full bg-[#FAF8F5] border border-[#BACBB0] focus:border-[#4C6239] rounded-xl px-3.5 py-2.5 text-xs text-[#202C1B] placeholder-[#8DA579] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Personal Note to Couple */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#3B4D2B]">
              Congratulatory Message to Tinashey & Samukelisiwe (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Wishing you a lifetime of love, prosperity and joy!"
              className="w-full bg-[#FAF8F5] border border-[#BACBB0] focus:border-[#4C6239] rounded-xl px-3.5 py-2.5 text-xs text-[#202C1B] placeholder-[#8DA579] focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#BACBB0]/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold btn-olive-luxury rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validating on Server...</span>
                </>
              ) : rsvpStatus === 'accepted' ? (
                'Confirm & Get 4-Digit Gate Pass →'
              ) : (
                'Save Response'
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
