import React, { useState, useMemo } from 'react';
import { Guest, WeddingConfig, ActivityLogItem } from '../types/wedding';
import {
  toggleGuestCheckIn,
  exportGuestsToCSV,
  resetDemoData,
  generateSingleUseIndividualToken,
} from '../services/weddingStorage';
import {
  isSupabaseConfigured,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  syncGuestsToSupabase,
} from '../services/supabase';
import { AddGuestModal } from './AddGuestModal';

interface AdminDashboardProps {
  config: WeddingConfig;
  allGuests: Guest[];
  activityLogs: ActivityLogItem[];
  onRefreshData: () => void;
  onViewGuestPass: (guest: Guest) => void;
  onNavigateToGate: () => void;
  onUpdateConfig?: (config: WeddingConfig) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config,
  allGuests,
  activityLogs,
  onRefreshData,
  onViewGuestPass,
  onNavigateToGate,
  onUpdateConfig,
}) => {
  // Search & Filtering state (No table filters)
  const [searchTerm, setSearchTerm] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'accepted' | 'declined' | 'pending'>('all');
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [vipOnly, setVipOnly] = useState(false);

  // Modals & Tabs
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'supabase' | 'activity' | 'design'>('roster');
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);

  // Background Design State
  const [bgImageInput, setBgImageInput] = useState(
    config.backgroundImageUrl && !config.backgroundImageUrl.includes('aistudio.google.com')
      ? config.backgroundImageUrl
      : '/assets/images/couple_portrait.jpg'
  );
  const [bgOpacityInput, setBgOpacityInput] = useState(config.backgroundOpacity ?? 0.22);
  const [designSavedMsg, setDesignSavedMsg] = useState('');

  // Supabase Settings state
  const creds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url);
  const [supabaseKey, setSupabaseKey] = useState(creds.anonKey);
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState('');
  const hasSupabase = isSupabaseConfigured();

  // REAL-TIME RSVP COUNTS & VENUE CAPACITY METRICS
  const metrics = useMemo(() => {
    const totalInvitedGuests = allGuests.length;
    const acceptedGuests = allGuests.filter((g) => g.rsvpStatus === 'accepted');
    const declinedGuests = allGuests.filter((g) => g.rsvpStatus === 'declined');
    const pendingGuests = allGuests.filter((g) => g.rsvpStatus === 'pending');

    const confirmedHeadcount = acceptedGuests.reduce((sum, g) => sum + (g.confirmedHeadcount || 1), 0);
    const maxInvitedHeadcount = allGuests.reduce((sum, g) => sum + g.partySize, 0);

    const checkedInGuests = allGuests.filter((g) => g.checkInStatus === 'checked_in');
    const checkedInHeadcount = checkedInGuests.reduce(
      (sum, g) => sum + (g.confirmedHeadcount || g.partySize || 1),
      0
    );

    const capacityPercent = Math.min(
      100,
      Math.round((checkedInHeadcount / config.venueCapacity) * 100)
    );

    const acceptanceRate = totalInvitedGuests > 0
      ? Math.round((acceptedGuests.length / totalInvitedGuests) * 100)
      : 0;

    return {
      totalInvitedGuests,
      acceptedCount: acceptedGuests.length,
      declinedCount: declinedGuests.length,
      pendingCount: pendingGuests.length,
      confirmedHeadcount,
      maxInvitedHeadcount,
      checkedInGuestsCount: checkedInGuests.length,
      checkedInHeadcount,
      capacityPercent,
      acceptanceRate,
    };
  }, [allGuests, config.venueCapacity]);

  // FILTERED GUEST LIST (No tables)
  const filteredGuests = useMemo(() => {
    return allGuests.filter((guest) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        guest.name.toLowerCase().includes(search) ||
        guest.email.toLowerCase().includes(search) ||
        guest.ticketCode.toLowerCase().includes(search) ||
        (guest.plusOneName && guest.plusOneName.toLowerCase().includes(search));

      if (!matchesSearch) return false;

      // RSVP Status
      if (rsvpFilter !== 'all' && guest.rsvpStatus !== rsvpFilter) return false;

      // Check-in Status
      if (checkInFilter !== 'all' && guest.checkInStatus !== checkInFilter) return false;

      // VIP filter
      if (vipOnly && !guest.isVIP) return false;

      return true;
    });
  }, [allGuests, searchTerm, rsvpFilter, checkInFilter, vipOnly]);

  // Handlers
  const handleToggleCheckIn = async (guestId: string) => {
    await toggleGuestCheckIn(guestId, 'Admin Console Override');
    onRefreshData();
  };

  const handleGenerateAndCopyNewToken = () => {
    const { url, guest } = generateSingleUseIndividualToken();
    navigator.clipboard.writeText(url);
    onRefreshData();
    alert(
      `✓ New Single-Use Invite Token Generated!\n\nLink copied to clipboard:\n${url}\n\n• Each time you click this button, a BRAND NEW link with a unique token is created.\n• Send this to 1 individual. They will fill in their own name and can RSVP for a MAXIMUM of 2 guests.\n• Once used, it is permanently locked and cannot be forwarded or reused.`
    );
  };

  const handleCopyInviteLink = (guest: Guest) => {
    const paramKey = guest.inviteType === 'individual' ? 'token' : 'guest';
    const url = `${window.location.origin}${window.location.pathname}?${paramKey}=${guest.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedGuestId(guest.id);
    setTimeout(() => setCopiedGuestId(null), 2000);
  };

  const handleDownloadCSV = () => {
    const csvData = exportGuestsToCSV(allGuests);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Wedding_Guest_Checkin_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = async () => {
    if (confirm('Permanently delete all guests and activity logs from Supabase and reset to 0?')) {
      await resetDemoData();
      try {
        localStorage.removeItem('aura_vows_guests_v7');
        localStorage.removeItem('aura_vows_activity_v7');
        localStorage.removeItem('aura_vows_guests_v6');
        localStorage.removeItem('aura_vows_activity_v6');
        localStorage.removeItem('aura_vows_guests_v5');
        localStorage.removeItem('aura_vows_activity_v5');
      } catch {}
      onRefreshData();
      alert('Database wiped clean! You are now starting fresh with 0 guests.');
    }
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    setSupabaseStatusMsg('Supabase configuration saved! Syncing guest data...');
    syncGuestsToSupabase(allGuests);
    setTimeout(() => {
      setSupabaseStatusMsg('Supabase synchronized successfully.');
      onRefreshData();
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#FBF9F5] min-h-screen text-stone-900 rounded-3xl shadow-2xl border border-stone-200">
      {/* Dashboard Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#4D633E] font-bold">
              Real-Time Administration
            </span>
            <span className="text-stone-600">·</span>
            {hasSupabase ? (
              <span className="text-xs font-mono text-emerald-700 font-bold">
                ⚡ Supabase Live Sync
              </span>
            ) : (
              <span className="text-xs font-mono text-stone-600">
                Storage: Local / Ready for Supabase
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mt-1">
            Wedding Operations Dashboard
          </h1>
          <p className="text-xs text-stone-600">
            {config.coupleNames} · {config.venueName} (Capacity: {config.venueCapacity} Max)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?type=family`;
              navigator.clipboard.writeText(url);
              alert('Copied Family Group RSVP Link:\n' + url + '\n\nSend this open link to both family WhatsApp/SMS groups. Anyone can RSVP with up to 4 guests!');
            }}
            className="px-3.5 py-2 btn-cream-luxury font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>👨‍👩‍👧‍👦</span>
            <span>Copy Family Group Link (Max 4)</span>
          </button>

          <button
            onClick={handleGenerateAndCopyNewToken}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg shadow-sm text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Generates a brand new single-use token link each time you click. Guests fill in their own names (Max 2 seats)."
          >
            <span>🔒</span>
            <span>+ Copy New Single-Use Link (Max 2)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>+</span>
            <span>Add Named Guest</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="px-3 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Export CSV
          </button>

          <button
            onClick={onNavigateToGate}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Launch Gate Scanner →
          </button>

          <button
            onClick={() => onRefreshData()}
            title="Fetch live truth from Supabase"
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <span>⚡</span>
            <span>Refresh Supabase</span>
          </button>

          <button
            onClick={handleResetData}
            title="Wipe local cache and reset to 0 guests"
            className="px-2.5 py-2 text-rose-600 hover:text-rose-800 text-xs font-semibold cursor-pointer border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1"
          >
            <span>🗑️</span>
            <span>Wipe Local Cache (0 Guests)</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (RSVP counts & Venue Capacity - Gifts & Tables removed) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI 1: Real-time RSVP Counts */}
        <div className="bg-white border border-stone-200 shadow-md rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#4D633E] font-bold">
              RSVP Summary
            </span>
            <span className="font-mono text-xs text-stone-600">
              {metrics.totalInvitedGuests} Parties
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-stone-900 tabular-nums">
                {metrics.acceptedCount}
              </span>
              <span className="text-xs text-emerald-700 font-bold">
                Accepted ({metrics.acceptanceRate}%)
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-600 pt-1">
              <span>{metrics.declinedCount} Declined</span>
              <span className="text-stone-400">·</span>
              <span>{metrics.pendingCount} Pending</span>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span>Confirmed Headcount:</span>
            <strong className="text-stone-900 font-mono font-bold">
              {metrics.confirmedHeadcount} Guests
            </strong>
          </div>
        </div>

        {/* KPI 2: Current Venue Capacity based on Check-ins */}
        <div className="bg-white border border-stone-200 shadow-md rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#4D633E] font-bold">
              Venue Check-In Capacity
            </span>
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                metrics.capacityPercent >= 90
                  ? 'bg-rose-100 text-rose-800'
                  : metrics.capacityPercent >= 75
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {metrics.capacityPercent}% Capacity
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-stone-900 tabular-nums">
                {metrics.checkedInHeadcount}
              </span>
              <span className="text-xs text-stone-600">
                / {config.venueCapacity} Max Guests
              </span>
            </div>

            <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  metrics.capacityPercent >= 90
                    ? 'bg-rose-600'
                    : metrics.capacityPercent >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${metrics.capacityPercent}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span>Passes Admitted:</span>
            <strong className="text-stone-900 font-mono font-bold">
              {metrics.checkedInGuestsCount} / {metrics.acceptedCount}
            </strong>
          </div>
        </div>

        {/* KPI 3: Database & Security Status */}
        <div className="bg-white border border-stone-200 shadow-md rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#4D633E] font-bold">
              Database Backend
            </span>
            <span className="text-xs font-mono text-stone-600">PostgreSQL</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-stone-900">
                {hasSupabase ? 'Supabase' : 'Local / Ready'}
              </span>
            </div>
            <p className="text-xs text-stone-600">
              {hasSupabase ? 'Realtime sync active via Supabase channels' : 'Schema generated in /supabase/schema.sql'}
            </p>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span>Single-Use Security:</span>
            <strong className="text-emerald-700 font-mono font-bold">Active & Enforced</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/70'
          }`}
        >
          Attendee Roster & Check-In ({filteredGuests.length})
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'supabase'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/70'
          }`}
        >
          <span>⚡ Supabase Database</span>
          {hasSupabase && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/70'
          }`}
        >
          Live Activity Feed ({activityLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('design')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'design'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/70'
          }`}
        >
          <span>🎨 Invitation Background & Photo</span>
        </button>
      </div>

      {/* TAB 1: ATTENDEE ROSTER (No tables) */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-stone-200 shadow-sm rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search guest by name, email, or 4-digit pass code (e.g. 8812)..."
                className="w-full bg-stone-50 border border-stone-300 rounded-lg pl-3 pr-8 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-600"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-stone-600 hover:text-stone-900 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                aria-label="Filter by RSVP status"
                value={rsvpFilter}
                onChange={(e) => setRsvpFilter(e.target.value as any)}
                className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All RSVPs</option>
                <option value="accepted">Accepted ({metrics.acceptedCount})</option>
                <option value="declined">Declined ({metrics.declinedCount})</option>
                <option value="pending">Pending ({metrics.pendingCount})</option>
              </select>

              <select
                aria-label="Filter by check-in status"
                value={checkInFilter}
                onChange={(e) => setCheckInFilter(e.target.value as any)}
                className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Check-in States</option>
                <option value="checked_in">Checked In Only ({metrics.checkedInGuestsCount})</option>
                <option value="not_checked_in">Awaiting Arrival</option>
              </select>

              <button
                type="button"
                onClick={() => setVipOnly(!vipOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  vipOnly
                    ? 'bg-amber-100 text-amber-900 border-amber-400'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                ★ VIP Only
              </button>
            </div>
          </div>

          {/* Attendee Roster Table (No table column) */}
          <div className="bg-white border border-stone-200 shadow-md rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-cinzel font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Guest & Party</th>
                    <th className="py-3.5 px-3">RSVP Status</th>
                    <th className="py-3.5 px-3">Headcount</th>
                    <th className="py-3.5 px-3">Dietary / Song</th>
                    <th className="py-3.5 px-3">Gate Check-In Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-stone-600">
                        No guests found matching the current search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => {
                      const isCheckedIn = guest.checkInStatus === 'checked_in';

                      return (
                        <tr
                          key={guest.id}
                          className="hover:bg-stone-50 transition-colors group"
                        >
                          {/* Guest Name & Party */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-semibold ${guest.name ? 'text-stone-900' : 'text-stone-600 italic'}`}>
                                  {guest.name || 'Awaiting Guest Registration'}
                                </span>
                                {guest.isVIP && (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                                    VIP
                                  </span>
                                )}
                                {guest.inviteType === 'family' ? (
                                  <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                                    Family Group
                                  </span>
                                ) : (
                                  <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded font-semibold" title="Single-Use Token Invite">
                                    Single-Use Token
                                  </span>
                                )}
                              </div>
                              {guest.plusOneName && (
                                <p className="text-[11px] text-stone-600">
                                  +1: {guest.plusOneName}
                                </p>
                              )}
                              <p className="text-[11px] text-stone-600 font-mono">
                                {guest.email}
                              </p>
                            </div>
                          </td>

                          {/* RSVP Status */}
                          <td className="py-3 px-3">
                            {guest.rsvpStatus === 'accepted' ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                                ✓ Accepted
                              </span>
                            ) : guest.rsvpStatus === 'declined' ? (
                              <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                                Declined
                              </span>
                            ) : (
                              <span className="bg-stone-100 text-stone-700 border border-stone-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Headcount */}
                          <td className="py-3 px-3">
                            <span className="font-mono text-stone-900 font-bold tabular-nums">
                              {guest.confirmedHeadcount || (guest.rsvpStatus === 'declined' ? 0 : guest.partySize)}
                            </span>
                            <span className="text-stone-600 text-[11px]"> of {guest.partySize}</span>
                          </td>

                          {/* Dietary / Song */}
                          <td className="py-3 px-3 max-w-[200px]">
                            <span className="truncate block text-stone-700" title={guest.dietaryRequirements}>
                              {guest.dietaryRequirements || 'None'}
                            </span>
                            {guest.songRequest && (
                              <span className="truncate block text-[10px] text-stone-600" title={guest.songRequest}>
                                🎵 {guest.songRequest}
                              </span>
                            )}
                          </td>

                          {/* Gate Check-In Status */}
                          <td className="py-3 px-3">
                            {isCheckedIn ? (
                              <div className="space-y-0.5">
                                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase inline-block">
                                  Checked In
                                </span>
                                <p className="text-[10px] text-stone-600 font-mono">
                                  {guest.checkInTime ? new Date(guest.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} · {guest.checkedInBy || 'Gate'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-stone-600 font-mono text-[11px]">
                                Not Checked In
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleCheckIn(guest.id)}
                                title={isCheckedIn ? 'Undo check-in' : 'Mark as checked in'}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isCheckedIn
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700 shadow-xs'
                                }`}
                              >
                                {isCheckedIn ? 'Undo' : 'Check-In'}
                              </button>

                              <button
                                onClick={() => onViewGuestPass(guest)}
                                title="View Guest QR Pass"
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                QR Pass
                              </button>

                              <button
                                onClick={() => handleCopyInviteLink(guest)}
                                title={guest.rsvpStatus !== 'pending' ? 'Copy Guest Pass Link (Already Used)' : 'Copy Single-Use Invite Token Link'}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                                  copiedGuestId === guest.id
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : guest.rsvpStatus !== 'pending'
                                    ? 'bg-stone-50 hover:bg-stone-100 text-stone-500 border-stone-200'
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                                }`}
                              >
                                {copiedGuestId === guest.id
                                  ? 'Copied!'
                                  : guest.rsvpStatus !== 'pending'
                                  ? 'Used Link'
                                  : 'Copy Token Link'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-stone-50 border-t border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-stone-600">
              <span>
                Showing <strong className="text-stone-900">{filteredGuests.length}</strong> of{' '}
                <strong className="text-stone-900">{allGuests.length}</strong> total guests
              </span>

              <span>
                Checked In Today:{' '}
                <strong className="text-stone-900 font-mono">
                  {metrics.checkedInGuestsCount} parties ({metrics.checkedInHeadcount} heads)
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPABASE DATABASE CONFIGURATION */}
      {activeTab === 'supabase' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-md space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h2 className="font-serif text-2xl font-semibold text-stone-900">
                Supabase PostgreSQL Configuration
              </h2>
            </div>
            <p className="text-xs text-stone-600">
              Connect your Supabase project for cloud persistence and real-time attendance synchronization.
            </p>
          </div>

          {/* Connection Status Card */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-4 ${
              hasSupabase
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-stone-50 border-stone-200 text-stone-800'
            }`}
          >
            <div className="space-y-0.5">
              <span className="font-semibold block">
                Status: {hasSupabase ? 'Connected to Supabase Project' : 'Running in Local Storage Mode (Ready to Connect)'}
              </span>
              <p className="text-[11px] opacity-80">
                {hasSupabase
                  ? `Connected endpoint: ${creds.url}`
                  : 'Enter your project credentials below or set VITE_SUPABASE_URL in .env to enable instant live cloud sync.'}
              </p>
            </div>

            {hasSupabase && (
              <button
                type="button"
                onClick={() => {
                  syncGuestsToSupabase(allGuests);
                  alert('Synced current guests to Supabase!');
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
              >
                Sync Now
              </button>
            )}
          </div>

          {/* Credential Setup Form */}
          <form onSubmit={handleSaveSupabase} className="space-y-4 max-w-xl">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Supabase Anon Public Key (API Key)
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-600"
              />
            </div>

            {supabaseStatusMsg && (
              <p className="text-xs text-emerald-700 font-bold">{supabaseStatusMsg}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Save Supabase Credentials & Sync
              </button>
            </div>
          </form>

          {/* Ready-to-Run SQL Schema Box */}
          <div className="pt-4 border-t border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-900">
                Supabase PostgreSQL Schema (Ready to Copy & Run)
              </span>
              <button
                type="button"
                onClick={() => {
                  const sql = `-- Aura Vows Supabase Schema
CREATE TABLE IF NOT EXISTS public.guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  ticket_code TEXT NOT NULL UNIQUE,
  rsvp_status TEXT NOT NULL DEFAULT 'pending',
  party_size INT NOT NULL DEFAULT 1,
  confirmed_headcount INT NOT NULL DEFAULT 0,
  plus_one_name TEXT,
  dietary_requirements TEXT DEFAULT 'None',
  song_request TEXT,
  notes TEXT,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  check_in_status TEXT NOT NULL DEFAULT 'not_checked_in',
  check_in_time TIMESTAMPTZ,
  checked_in_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON public.guests FOR ALL USING (true);`;
                  navigator.clipboard.writeText(sql);
                  alert('Supabase SQL schema copied to clipboard! Paste it into the Supabase SQL Editor.');
                }}
                className="text-xs font-semibold text-stone-900 underline hover:text-stone-700 cursor-pointer"
              >
                Copy SQL Script 📋
              </button>
            </div>
            <p className="text-[11px] text-stone-600">
              Run this in your Supabase dashboard at <code>SQL Editor</code>. The schema is also saved in <code>supabase/schema.sql</code>.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE ACTIVITY STREAM */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-md space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-stone-900">
              Live Arrival & Activity Stream
            </h2>
            <p className="text-xs text-stone-600">
              Real-time audit log of check-in scans, duplicate rejections, and RSVPs.
            </p>
          </div>

          <div className="divide-y divide-stone-200 max-h-96 overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                        log.severity === 'success'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.severity === 'warning'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {log.type.replace('_', ' ')}
                    </span>
                    <strong className="text-xs font-semibold text-stone-900">
                      {log.guestName}
                    </strong>
                  </div>
                  <p className="text-xs text-stone-600">{log.details}</p>
                </div>

                <span className="text-[11px] font-mono text-stone-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INVITATION DESIGN & BACKGROUND PHOTO */}
      {activeTab === 'design' && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-stone-900">
                Invitation Background & Photo Settings
              </h2>
              <p className="text-xs text-stone-600">
                Configure the background photo for {config.coupleNames}'s invitation and adjust faintness so the wording stays crystal clear.
              </p>
            </div>

            {designSavedMsg && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 animate-fade-in">
                ✓ {designSavedMsg}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Photo Options */}
              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-wider font-semibold text-stone-700">
                  Select Background Photo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Preset 1: Couple Photo */}
                  <div
                    onClick={() => setBgImageInput('/assets/images/couple_portrait.jpg')}
                    className={`cursor-pointer rounded-2xl border-2 p-2 transition-all ${
                      bgImageInput.includes('couple_portrait') || bgImageInput.includes('user_uploaded') || bgImageInput.includes('tinashe')
                        ? 'border-stone-900 ring-2 ring-stone-900/10'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#1A1A24] mb-2">
                      <img
                        src="/assets/images/couple_portrait.jpg"
                        alt="Tinashey & Samukelisiwe"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <p className="text-xs font-semibold text-stone-900 truncate">Tinashey & Samukelisiwe</p>
                    <p className="text-[10px] text-stone-600">Official Portrait (Active)</p>
                  </div>

                  {/* Preset 2: Swan Creek Gardens */}
                  <div
                    onClick={() => setBgImageInput('/src/assets/images/swan_creek_gardens_venue_1791921672492.jpg')}
                    className={`cursor-pointer rounded-2xl border-2 p-2 transition-all ${
                      bgImageInput.includes('swan_creek_gardens')
                        ? 'border-stone-900 ring-2 ring-stone-900/10'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#1A1A24] mb-2">
                      <img
                        src="/src/assets/images/swan_creek_gardens_venue_1791921672492.jpg"
                        alt="Swan Creek Gardens"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs font-semibold text-stone-900 truncate">Swan Creek Gardens</p>
                    <p className="text-[10px] text-stone-600">Estate Lawn & Canopy</p>
                  </div>

                  {/* Preset 3: Romantic Couple */}
                  <div
                    onClick={() => setBgImageInput('/src/assets/images/wedding_hero_couple_1791916584274.jpg')}
                    className={`cursor-pointer rounded-2xl border-2 p-2 transition-all ${
                      bgImageInput.includes('wedding_hero_couple')
                        ? 'border-stone-900 ring-2 ring-stone-900/10'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#1A1A24] mb-2">
                      <img
                        src="/src/assets/images/wedding_hero_couple_1791916584274.jpg"
                        alt="Wedding Couple"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs font-semibold text-stone-900 truncate">Ceremony Embrace</p>
                    <p className="text-[10px] text-stone-600">Gold & Champagne</p>
                  </div>
                </div>
              </div>

              {/* Upload Custom Image or Enter URL */}
              <div className="space-y-2 p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                <span className="block text-xs font-semibold text-stone-800">
                  Or Upload Another Photo from Your Device
                </span>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-4 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 hover:bg-stone-100 cursor-pointer text-center">
                    <span>Choose File...</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (uploadEvent) => {
                            if (uploadEvent.target?.result) {
                              setBgImageInput(uploadEvent.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={bgImageInput}
                    onChange={(e) => setBgImageInput(e.target.value)}
                    placeholder="Or paste an image URL (https://...)"
                    className="flex-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Faintness & Opacity Slider */}
              <div className="space-y-3 p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider font-semibold text-stone-700">
                    Background Faintness / Opacity
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-900">
                    {Math.round(bgOpacityInput * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0.08"
                  max="0.45"
                  step="0.01"
                  value={bgOpacityInput}
                  onChange={(e) => setBgOpacityInput(parseFloat(e.target.value))}
                  className="w-full accent-stone-900 cursor-pointer"
                />

                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>Faint (10%)</span>
                  <span className="font-semibold text-stone-900">Recommended (22% - Words highly visible)</span>
                  <span>Strong (40%)</span>
                </div>
              </div>

              {/* Save & Apply Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const updatedConfig: WeddingConfig = {
                      ...config,
                      backgroundImageUrl: bgImageInput,
                      backgroundOpacity: bgOpacityInput,
                    };
                    if (onUpdateConfig) {
                      onUpdateConfig(updatedConfig);
                    }
                    setDesignSavedMsg('Saved! Live invitation updated successfully.');
                    setTimeout(() => setDesignSavedMsg(''), 4000);
                  }}
                  className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer shadow-md"
                >
                  Save & Apply to Live Invitation
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBgImageInput('/assets/images/couple_portrait.jpg');
                    setBgOpacityInput(0.22);
                  }}
                  className="px-4 py-3 border border-stone-300 text-stone-700 rounded-xl text-xs font-medium hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Live Mini Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-2">
              <span className="block text-xs uppercase tracking-wider font-semibold text-stone-700">
                Live Card Preview
              </span>
              <p className="text-[11px] text-stone-600 mb-2">
                Simulating the faint photo background behind the invitation words.
              </p>

              <div className="relative bg-gradient-to-b from-[#FFFFFF] via-[#FAF8F5] to-[#F5EFE6] border-2 border-[#BACBB0] rounded-2xl p-6 text-center text-[#202C1B] overflow-hidden shadow-xl gold-box-glow select-none">
                {/* Background photo with active opacity */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                  <img
                    src={bgImageInput}
                    alt="Preview"
                    className="w-full h-full object-cover object-center filter contrast-105"
                    style={{ opacity: bgOpacityInput }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/85 via-[#FAF8F5]/70 to-[#FAF8F5]/92" />
                </div>

                {/* Inner border */}
                <div className="absolute inset-2 border border-[#A0B98A]/35 rounded-xl pointer-events-none z-10" />

                <div className="relative z-10 space-y-3">
                  <div className="w-10 h-10 rounded-full border border-[#7A9961] bg-[#F2F6ED] mx-auto flex items-center justify-center shadow-xs">
                    <span className="font-wedding text-xl text-[#2B3B22] pt-1 font-bold">T&S</span>
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="font-wedding text-2xl gold-gradient-text font-bold">{config.partner1 || 'Tinashey Mutandwa'}</h3>
                    {config.partner1Title ? <p className="font-serif-luxury italic text-[10px] text-[#5D704E]">{config.partner1Title}</p> : null}
                    <span className="font-wedding text-lg text-[#7A9961] block leading-none font-bold">&</span>
                    <h3 className="font-wedding text-2xl gold-gradient-text font-bold">{config.partner2 || 'Samukelisiwe Sibanda'}</h3>
                    {config.partner2Title ? <p className="font-serif-luxury italic text-[10px] text-[#5D704E]">{config.partner2Title}</p> : null}
                  </div>

                  <p className="font-serif-luxury italic text-xs text-[#2B3B22] pt-1">
                    “Joyfully invite you to celebrate our union in marriage”
                  </p>

                  <div className="pt-2 border-t border-[#BACBB0]/50 space-y-0.5">
                    <p className="font-cinzel text-xs text-[#1D2615] uppercase font-bold">Monday, 21 December 2026</p>
                    <p className="font-serif-luxury text-[11px] text-[#5D704E] font-medium">{config.venueName} · 851 Goodhope Road</p>
                    <p className="font-cinzel text-[10px] text-[#5D704E] tracking-wider uppercase pt-1 font-semibold">Attire: Olive Green & Cream</p>
                  </div>

                  <div className="pt-2">
                    <div className="inline-block px-5 py-2 btn-olive-luxury font-cinzel text-[10px] font-bold uppercase rounded-full shadow-md">
                      RSVP to Attend
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AddGuestModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onGuestAdded={() => {
          onRefreshData();
        }}
      />
    </div>
  );
};

