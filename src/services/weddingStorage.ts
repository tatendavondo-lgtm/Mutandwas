import { Guest, WeddingConfig, ActivityLogItem } from '../types/wedding';
import {
  INITIAL_WEDDING_CONFIG,
  INITIAL_GUESTS,
  INITIAL_ACTIVITY_LOGS,
} from '../data/mockData';
import {
  syncGuestsToSupabase,
  logActivityToSupabase,
  updateGuestCheckInInSupabase,
  upsertSingleGuestToSupabase,
  fetchGuestsFromSupabase,
  isSupabaseConfigured,
} from './supabase';

export const STORAGE_KEYS = {
  GUESTS: 'aura_vows_guests_v8',
  CONFIG: 'aura_vows_config_v8',
  ACTIVITY: 'aura_vows_activity_v8',
};

// Clean legacy test caches automatically so users start fresh with Tinashe & Samukelisiwe
if (typeof window !== 'undefined') {
  try {
    const oldCfg = localStorage.getItem('aura_vows_config_v7');
    if (oldCfg && (oldCfg.includes('Blessing') || oldCfg.includes('Ruvarashe'))) {
      localStorage.removeItem('aura_vows_config_v7');
      localStorage.removeItem('aura_vows_guests_v7');
      localStorage.removeItem('aura_vows_activity_v7');
    }
    localStorage.removeItem('aura_vows_guests_v5');
    localStorage.removeItem('aura_vows_activity_v5');
    localStorage.removeItem('aura_vows_guests_v4');
    localStorage.removeItem('aura_vows_guests_v3');
  } catch {
    // ignore
  }
}

// Cross-tab real-time broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('aura_vows_realtime_sync_v8');
  }
} catch {
  // BroadcastChannel unavailable
}

export type RealTimeEvent =
  | { type: 'GUESTS_UPDATED'; payload: Guest[] }
  | { type: 'CHECK_IN_EVENT'; payload: { guest: Guest; isDuplicate: boolean; gate: string } }
  | { type: 'ACTIVITY_LOGGED'; payload: ActivityLogItem };

type RealTimeListener = (event: RealTimeEvent) => void;
const listeners: Set<RealTimeListener> = new Set();

if (broadcastChannel) {
  broadcastChannel.onmessage = (event: MessageEvent<RealTimeEvent>) => {
    listeners.forEach((listener) => listener(event.data));
  };
}

export function subscribeRealTime(listener: RealTimeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function broadcast(event: RealTimeEvent) {
  listeners.forEach((listener) => listener(event));
  try {
    broadcastChannel?.postMessage(event);
  } catch {
    // Ignore postMessage failure
  }
}

/**
 * Generate a unique random 4-digit pass code for fast gate check-in (e.g. 4821)
 */
export function generateRandom4DigitCode(existingGuests: Guest[] = []): string {
  const existing = new Set(existingGuests.map((g) => g.ticketCode?.trim().toUpperCase()));
  for (let attempt = 0; attempt < 2000; attempt++) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    if (!existing.has(code)) {
      return code;
    }
  }
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// STORAGE ACCESSORS
export function getWeddingConfig(): WeddingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        !parsed.backgroundImageUrl ||
        parsed.backgroundImageUrl.includes('aistudio.google.com') ||
        parsed.backgroundImageUrl.includes('blessing_ruvarashe') ||
        parsed.backgroundImageUrl.includes('wedding_couple_portrait') ||
        parsed.coupleNames?.includes('Blessing') ||
        parsed.venueName?.includes('Swan Creek')
      ) {
        return INITIAL_WEDDING_CONFIG;
      }
      return {
        ...INITIAL_WEDDING_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to load wedding config:', e);
  }
  return INITIAL_WEDDING_CONFIG;
}

export function saveWeddingConfig(config: WeddingConfig) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function getGuests(): Guest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GUESTS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [];
}

/**
 * Save guests to localStorage and broadcast across tabs.
 * Never bulk-overwrites Supabase unless syncAllToCloud is explicitly true.
 */
export function saveGuests(guests: Guest[], syncAllToCloud = false) {
  try {
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(guests));
  } catch {}
  broadcast({ type: 'GUESTS_UPDATED', payload: guests });
  if (syncAllToCloud) {
    void syncGuestsToSupabase(guests);
  }
}

export function getActivityLogs(): ActivityLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [];
}

export function logActivity(item: Omit<ActivityLogItem, 'id' | 'timestamp'>) {
  const current = getActivityLogs();
  const newItem: ActivityLogItem = {
    ...item,
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
  };
  const updated = [newItem, ...current].slice(0, 50);
  localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(updated));
  broadcast({ type: 'ACTIVITY_LOGGED', payload: newItem });
  void logActivityToSupabase(newItem);
  return newItem;
}

// SELF-REGISTRATION & DIRECT LINK RSVP SUBMISSION
export function submitGuestSelfRSVP(data: {
  name: string;
  email: string;
  phone?: string;
  rsvpStatus: 'accepted' | 'declined';
  partySize: number;
  confirmedHeadcount: number;
  plusOneName?: string;
  dietaryRequirements?: string;
  songRequest?: string;
  notes?: string;
  existingId?: string;
  inviteType?: 'family' | 'individual';
}): Guest {
  const guests = getGuests();

  // Check if matching by existingId or email
  let targetIndex = -1;
  if (data.existingId) {
    targetIndex = guests.findIndex((g) => g.id === data.existingId);
  } else if (data.email) {
    targetIndex = guests.findIndex((g) => g.email.toLowerCase() === data.email.toLowerCase());
  }

  let finalGuest: Guest;

  if (targetIndex >= 0) {
    // Update existing record
    const existing = guests[targetIndex];
    finalGuest = {
      ...existing,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || existing.phone,
      rsvpStatus: data.rsvpStatus,
      confirmedHeadcount: data.rsvpStatus === 'accepted' ? data.confirmedHeadcount : 0,
      partySize: Math.max(existing.partySize, data.confirmedHeadcount),
      plusOneName: data.plusOneName?.trim() || undefined,
      dietaryRequirements: data.dietaryRequirements?.trim() || 'None',
      songRequest: data.songRequest?.trim() || existing.songRequest,
      notes: data.notes?.trim() || existing.notes,
      inviteType: data.inviteType || existing.inviteType || 'individual',
    };
    guests[targetIndex] = finalGuest;
  } else {
    // Create new guest registration (e.g. from family group open link)
    const id = 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5);
    const inviteCode = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const ticketCode = generateRandom4DigitCode(guests);

    finalGuest = {
      id,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim(),
      inviteCode,
      ticketCode,
      rsvpStatus: data.rsvpStatus,
      partySize: data.partySize || data.confirmedHeadcount || 1,
      confirmedHeadcount: data.rsvpStatus === 'accepted' ? data.confirmedHeadcount : 0,
      plusOneName: data.plusOneName?.trim(),
      dietaryRequirements: data.dietaryRequirements?.trim() || 'None',
      songRequest: data.songRequest?.trim(),
      notes: data.notes?.trim(),
      isVIP: false,
      inviteType: data.inviteType || 'family',
      checkInStatus: 'not_checked_in',
    };
    guests.unshift(finalGuest);
  }

  saveGuests(guests);
  void upsertSingleGuestToSupabase(finalGuest);

  logActivity({
    type: 'rsvp_updated',
    guestName: finalGuest.name,
    details: `RSVP submitted via link: ${finalGuest.rsvpStatus.toUpperCase()} (${finalGuest.confirmedHeadcount} seats) - Pass Code ${finalGuest.ticketCode}`,
    severity: finalGuest.rsvpStatus === 'accepted' ? 'success' : 'info',
  });

  return finalGuest;
}

// SCAN TICKET WITH STRICT SINGLE-USE ENFORCEMENT & LIVE DATABASE VERIFICATION
export interface ScanResult {
  success: boolean;
  reason?: 'ALREADY_SCANNED' | 'INVALID_CODE' | 'DECLINED_RSVP';
  guest?: Guest;
  message: string;
  previousCheckIn?: {
    time: string;
    gate: string;
  };
}

export async function scanGuestTicket(
  ticketOrInviteCode: string,
  gateName = 'Gletwyn Main Gate 1'
): Promise<ScanResult> {
  // Always pull the latest truth from Supabase first if configured so used codes are strictly refused
  let guests = getGuests();
  if (isSupabaseConfigured()) {
    const cloudGuests = await fetchGuestsFromSupabase();
    if (cloudGuests !== null) {
      guests = cloudGuests;
      try {
        localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(cloudGuests));
      } catch {}
    }
  }

  const cleanCode = ticketOrInviteCode.trim().toUpperCase();
  const digitsOnly = cleanCode.replace(/\D/g, '');

  const guestIndex = guests.findIndex(
    (g) =>
      g.ticketCode.toUpperCase() === cleanCode ||
      (digitsOnly.length >= 4 && g.ticketCode.replace(/\D/g, '') === digitsOnly) ||
      g.inviteCode.toUpperCase() === cleanCode ||
      g.id.toUpperCase() === cleanCode
  );

  if (guestIndex === -1) {
    logActivity({
      type: 'duplicate_attempt',
      guestName: 'Unknown Pass (' + cleanCode + ')',
      details: `Attempted check-in at ${gateName}: Unrecognized 4-digit pass code`,
      severity: 'warning',
    });
    return {
      success: false,
      reason: 'INVALID_CODE',
      message: `Invalid 4-digit pass code "${cleanCode}". Not found on the official guest list.`,
    };
  }

  const guest = guests[guestIndex];

  // Check if RSVP was declined
  if (guest.rsvpStatus === 'declined') {
    return {
      success: false,
      reason: 'DECLINED_RSVP',
      guest,
      message: `Pass rejected: Guest "${guest.name}" previously marked their RSVP as Declined.`,
    };
  }

  // STRICT SINGLE-USE ENFORCEMENT (Refuses any already-used code)
  if (guest.checkInStatus === 'checked_in') {
    const prevTime = guest.checkInTime
      ? new Date(guest.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'earlier';
    const prevGate = guest.checkedInBy || 'Security Gate';

    saveGuests(guests);

    logActivity({
      type: 'duplicate_attempt',
      guestName: guest.name,
      details: `DUPLICATE SCAN PREVENTED at ${gateName}. Already admitted at ${prevTime} via ${prevGate}.`,
      severity: 'warning',
    });

    return {
      success: false,
      reason: 'ALREADY_SCANNED',
      guest,
      message: `ACCESS DENIED: Pass code ${guest.ticketCode} has already been used! Admitted at ${prevTime} via ${prevGate}.`,
      previousCheckIn: {
        time: prevTime,
        gate: prevGate,
      },
    };
  }

  // FIRST TIME VALID SCAN
  const nowIso = new Date().toISOString();
  const updatedGuest: Guest = {
    ...guest,
    checkInStatus: 'checked_in',
    checkInTime: nowIso,
    checkedInBy: gateName,
    checkInHistory: [
      ...(guest.checkInHistory || []),
      {
        timestamp: nowIso,
        gate: gateName,
        headcount: guest.confirmedHeadcount || guest.partySize || 1,
      },
    ],
  };

  guests[guestIndex] = updatedGuest;
  saveGuests(guests);

  // Immediately persist check-in status to Supabase
  await updateGuestCheckInInSupabase(
    updatedGuest.id,
    'checked_in',
    nowIso,
    gateName
  );

  logActivity({
    type: 'check_in',
    guestName: updatedGuest.name,
    details: `Admitted party of ${updatedGuest.confirmedHeadcount || updatedGuest.partySize || 1} via ${gateName}`,
    severity: 'success',
  });

  return {
    success: true,
    guest: updatedGuest,
    message: `Entry verified! Welcome ${updatedGuest.name} (Party of ${updatedGuest.confirmedHeadcount || updatedGuest.partySize || 1}).`,
  };
}

export async function toggleGuestCheckIn(
  guestId: string,
  manualGate = 'Admin Console'
): Promise<Guest | null> {
  let guests = getGuests();
  let idx = guests.findIndex((g) => g.id === guestId);

  if (idx === -1 && isSupabaseConfigured()) {
    const cloudGuests = await fetchGuestsFromSupabase();
    if (cloudGuests !== null) {
      guests = cloudGuests;
      idx = guests.findIndex((g) => g.id === guestId);
    }
  }
  if (idx === -1) return null;

  const current = guests[idx];
  const isNowCheckedIn = current.checkInStatus !== 'checked_in';
  const nowIso = new Date().toISOString();

  const updated: Guest = {
    ...current,
    checkInStatus: isNowCheckedIn ? 'checked_in' : 'not_checked_in',
    checkInTime: isNowCheckedIn ? nowIso : undefined,
    checkedInBy: isNowCheckedIn ? manualGate : undefined,
  };

  guests[idx] = updated;
  saveGuests(guests);

  await updateGuestCheckInInSupabase(
    updated.id,
    updated.checkInStatus,
    updated.checkInTime,
    updated.checkedInBy
  );

  logActivity({
    type: isNowCheckedIn ? 'check_in' : 'rsvp_updated',
    guestName: updated.name,
    details: isNowCheckedIn
      ? `Manual check-in confirmed via ${manualGate}`
      : `Check-in reversed to Not Checked In via ${manualGate}`,
    severity: isNowCheckedIn ? 'success' : 'info',
  });

  return updated;
}

export function addGuest(newGuest: Omit<Guest, 'id' | 'ticketCode' | 'checkInStatus'>): Guest {
  const guests = getGuests();
  const id = 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5);
  const ticketCode = generateRandom4DigitCode(guests);

  const guest: Guest = {
    ...newGuest,
    id,
    ticketCode,
    checkInStatus: 'not_checked_in',
  };

  const updated = [...guests, guest];
  saveGuests(updated);
  void upsertSingleGuestToSupabase(guest);

  logActivity({
    type: 'rsvp_updated',
    guestName: guest.name,
    details: `Added new guest to guest list (${guest.partySize} seats) - Pass Code ${guest.ticketCode}`,
    severity: 'info',
  });

  return guest;
}

/**
 * Generate a single-use token invite for an individual guest from Admin Dashboard.
 * Admin does NOT need to enter the guest's name upfront.
 * The recipient enters their own name and answers RSVP questions (Max 2 guests).
 * Once submitted, this link/token is permanently locked against reuse or forwarding.
 */
export function generateSingleUseIndividualToken(): { guest: Guest; url: string } {
  const guests = getGuests();
  const id = 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  const ticketCode = generateRandom4DigitCode(guests);
  const token = 'pass_' + Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 6);

  const guest: Guest = {
    id,
    name: '', // Blank so the recipient fills their own name
    email: '',
    inviteCode: token,
    ticketCode,
    partySize: 2, // Maximum 2 guests allowed for individual links
    confirmedHeadcount: 0,
    rsvpStatus: 'pending',
    dietaryRequirements: 'None',
    isVIP: false,
    inviteType: 'individual',
    checkInStatus: 'not_checked_in',
  };

  const updated = [guest, ...guests];
  saveGuests(updated);
  void upsertSingleGuestToSupabase(guest);

  logActivity({
    type: 'rsvp_updated',
    guestName: 'Single-Use Pass Token',
    details: `Generated fresh single-use individual RSVP link (Token: ${token}, Max 2 Guests)`,
    severity: 'info',
  });

  const url = `${window.location.origin}${window.location.pathname}?token=${token}`;
  return { guest, url };
}

export async function resetDemoData() {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_WEDDING_CONFIG));
  localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify([]));
  broadcast({ type: 'GUESTS_UPDATED', payload: [] });
  await syncGuestsToSupabase([]);
}

export function exportGuestsToCSV(guests: Guest[]): string {
  const headers = [
    'Guest Name',
    'Email',
    'Phone',
    'RSVP Status',
    'Max Party Size',
    'Attending Headcount',
    'Plus One Name',
    'Dietary Requirements',
    'Check-In Status',
    'Check-In Time',
    'Gate Scanned By',
    '4-Digit Pass Code',
    'Song Request',
  ];

  const rows = guests.map((g) => [
    `"${g.name}"`,
    `"${g.email}"`,
    `"${g.phone || ''}"`,
    `"${g.rsvpStatus}"`,
    g.partySize,
    g.confirmedHeadcount,
    `"${g.plusOneName || ''}"`,
    `"${g.dietaryRequirements.replace(/"/g, '""')}"`,
    `"${g.checkInStatus}"`,
    `"${g.checkInTime || ''}"`,
    `"${g.checkedInBy || ''}"`,
    `"${g.ticketCode}"`,
    `"${(g.songRequest || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
