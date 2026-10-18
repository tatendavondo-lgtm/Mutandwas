import React, { useState } from 'react';
import { Guest } from '../types/wedding';
import { addGuest } from '../services/weddingStorage';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestAdded: (guest: Guest) => void;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({
  isOpen,
  onClose,
  onGuestAdded,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [dietary, setDietary] = useState('None');
  const [isVIP, setIsVIP] = useState(false);
  const [inviteType, setInviteType] = useState<'individual' | 'family'>('individual');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // For single-use individual links, generate an unguessable token
    const token = 'tok_' + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 6);
    const inviteCode = inviteType === 'individual' ? token : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const created = addGuest({
      name: name.trim(),
      email: email.trim() || `${token}@individual.rsvp`,
      phone: phone.trim() || undefined,
      inviteCode,
      partySize,
      confirmedHeadcount: 0,
      rsvpStatus: 'pending',
      dietaryRequirements: dietary.trim() || 'Pending',
      isVIP,
      inviteType,
    });

    onGuestAdded(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl max-w-lg w-full p-6 sm:p-8 space-y-5 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm cursor-pointer"
        >
          ✕
        </button>

        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-semibold text-stone-900">
            Add New Wedding Guest
          </h2>
          <p className="text-xs text-stone-500">
            Creates a unique personalized RSVP link and 4-digit gate pass code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link Type Selector */}
          <div className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              Invitation Link Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInviteType('individual')}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  inviteType === 'individual'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🔒</span>
                  <span className="text-xs font-bold">Single-Use Token</span>
                </div>
                <p className={`text-[10px] mt-0.5 leading-tight ${inviteType === 'individual' ? 'text-stone-300' : 'text-stone-500'}`}>
                  For individuals. Permanently locked once RSVP'd (cannot be forwarded or reused).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInviteType('family')}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  inviteType === 'family'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">👨‍👩‍👧‍👦</span>
                  <span className="text-xs font-bold">Family / Open Link</span>
                </div>
                <p className={`text-[10px] mt-0.5 leading-tight ${inviteType === 'family' ? 'text-stone-300' : 'text-stone-500'}`}>
                  For family groups without restrictions. Anyone can register their name & seats.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Primary Guest Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Liam Gallagher"
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="liam@example.com (optional)"
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Max Party Size
              </label>
              <select
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-600"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Seat' : 'Seats'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                VIP Status
              </label>
              <button
                type="button"
                onClick={() => setIsVIP(!isVIP)}
                className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer text-center ${
                  isVIP
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {isVIP ? '★ VIP Guest' : 'Standard Guest'}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-stone-700">
              Dietary Notes (Optional)
            </label>
            <input
              type="text"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="e.g. Vegetarian, Gluten-Free"
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Create Guest & Generate Pass
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
