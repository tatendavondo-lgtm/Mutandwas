import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Guest, ActivityLogItem } from '../types/wedding';

// Storage keys for local fallback credentials
const STORAGE_SUPABASE_URL_KEY = 'aura_vows_supabase_url';
const STORAGE_SUPABASE_ANON_KEY = 'aura_vows_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const localUrl = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_URL_KEY) || '' : '').trim();
  const localKey = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_ANON_KEY) || '' : '').trim();

  const finalUrl = envUrl || localUrl;
  const finalKey = envKey || localKey;

  return {
    url: finalUrl && !finalUrl.includes('your-project-id') ? finalUrl : '',
    anonKey: finalKey && !finalKey.includes('...') ? finalKey : '',
  };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, anonKey.trim());
    // Invalidate cached client to recreate with new credentials
    supabaseInstance = null;
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey);
}

// Convert DB snake_case record to Guest model
export function mapRowToGuest(row: any): Guest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || undefined,
    inviteCode: row.invite_code,
    ticketCode: row.ticket_code,
    rsvpStatus: row.rsvp_status,
    partySize: row.party_size,
    confirmedHeadcount: row.confirmed_headcount,
    plusOneName: row.plus_one_name || undefined,
    dietaryRequirements: row.dietary_requirements || 'None',
    songRequest: row.song_request || undefined,
    notes: row.notes || undefined,
    isVIP: Boolean(row.is_vip),
    inviteType: (row.invite_code?.startsWith('pass_') || row.invite_code?.startsWith('tok_') || row.invite_type === 'individual') ? 'individual' : 'family',
    checkInStatus: row.check_in_status,
    checkInTime: row.check_in_time || undefined,
    checkedInBy: row.checked_in_by || undefined,
  };
}

// Convert Guest model to DB snake_case record
export function mapGuestToRow(g: Guest): any {
  return {
    id: g.id,
    name: g.name,
    email: g.email,
    phone: g.phone || null,
    invite_code: g.inviteCode,
    ticket_code: g.ticketCode,
    rsvp_status: g.rsvpStatus,
    party_size: g.partySize,
    confirmed_headcount: g.confirmedHeadcount,
    plus_one_name: g.plusOneName || null,
    dietary_requirements: g.dietaryRequirements,
    song_request: g.songRequest || null,
    notes: g.notes || null,
    is_vip: g.isVIP || false,
    check_in_status: g.checkInStatus,
    check_in_time: g.checkInTime || null,
    checked_in_by: g.checkedInBy || null,
  };
}

// Track active writes so background polling never overwrites an in-flight check-in
let activeWriteCount = 0;
let lastWriteCompletedAt = 0;

export function isSupabaseWriteInFlight(): boolean {
  return activeWriteCount > 0 || Date.now() - lastWriteCompletedAt < 1500;
}

// Fetch all guests from Supabase
export async function fetchGuestsFromSupabase(): Promise<Guest[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('guests')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error fetching guests from Supabase:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map(mapRowToGuest);
    }
    return [];
  } catch (err) {
    console.warn('Supabase fetch exception:', err);
    return null;
  }
}

// Fetch latest activity logs from Supabase
export async function fetchActivityLogsFromSupabase(): Promise<ActivityLogItem[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Error fetching activity logs from Supabase:', error.message);
      return null;
    }

    if (data) {
      return data.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type,
        guestName: row.guest_name,
        details: row.details,
        severity: row.severity || 'info',
      }));
    }
    return [];
  } catch (err) {
    console.warn('Supabase activity logs fetch exception:', err);
    return null;
  }
}

// Real-time live synchronization for multi-device check-in
export function subscribeToGuestsRealtime(
  onGuestUpdated: (updatedGuest: Guest) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('public:guests:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guests' },
        (payload) => {
          if (payload.new && (payload.new as any).id) {
            const guest = mapRowToGuest(payload.new);
            onGuestUpdated(guest);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase realtime subscription error:', err);
    return null;
  }
}

// Real-time live synchronization for activity logs
export function subscribeToActivityLogsRealtime(
  onActivityLogged: (item: ActivityLogItem) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('public:activity_logs:realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          if (payload.new && (payload.new as any).id) {
            const row = payload.new as any;
            onActivityLogged({
              id: row.id,
              timestamp: row.timestamp,
              type: row.type,
              guestName: row.guest_name,
              details: row.details,
              severity: row.severity || 'info',
            });
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase activity realtime error:', err);
    return null;
  }
}

// Single-guest update in Supabase (fast check-in update)
export async function updateGuestCheckInInSupabase(
  guestId: string,
  checkInStatus: 'checked_in' | 'not_checked_in',
  checkInTime?: string,
  checkedInBy?: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  activeWriteCount++;
  try {
    const { error } = await client
      .from('guests')
      .update({
        check_in_status: checkInStatus,
        check_in_time: checkInTime || null,
        checked_in_by: checkedInBy || null,
      })
      .eq('id', guestId);

    if (error) {
      console.error('Supabase check-in update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase single guest check-in update error:', err);
    return false;
  } finally {
    activeWriteCount = Math.max(0, activeWriteCount - 1);
    lastWriteCompletedAt = Date.now();
  }
}

// Wipe all guests and activity logs in Supabase
export async function wipeSupabaseData(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  activeWriteCount++;
  try {
    await client.from('guests').delete().neq('id', '___none___');
    await client.from('activity_logs').delete().neq('id', '___none___');
    return true;
  } catch (err) {
    console.warn('Supabase wipe error:', err);
    return false;
  } finally {
    activeWriteCount = Math.max(0, activeWriteCount - 1);
    lastWriteCompletedAt = Date.now();
  }
}

// Save or sync guests array to Supabase (wipes table if empty array is passed)
export async function syncGuestsToSupabase(guests: Guest[]) {
  const client = getSupabaseClient();
  if (!client) return;

  if (guests.length === 0) {
    await wipeSupabaseData();
    return;
  }

  activeWriteCount++;
  try {
    const rows = guests.map(mapGuestToRow);
    const { error } = await client.from('guests').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsert error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase sync exception:', err);
  } finally {
    activeWriteCount = Math.max(0, activeWriteCount - 1);
    lastWriteCompletedAt = Date.now();
  }
}

// Single-guest upsert (for individual RSVP submissions or adding a guest)
export async function upsertSingleGuestToSupabase(guest: Guest): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  activeWriteCount++;
  try {
    const row = mapGuestToRow(guest);
    const { error } = await client.from('guests').upsert([row], { onConflict: 'id' });
    if (error) {
      console.warn('Supabase single guest upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase single guest upsert exception:', err);
    return false;
  } finally {
    activeWriteCount = Math.max(0, activeWriteCount - 1);
    lastWriteCompletedAt = Date.now();
  }
}

// Log activity to Supabase
export async function logActivityToSupabase(item: ActivityLogItem) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('activity_logs').insert([
      {
        id: item.id,
        timestamp: item.timestamp,
        type: item.type,
        guest_name: item.guestName,
        details: item.details,
        severity: item.severity || 'info',
      },
    ]);
  } catch (err) {
    console.warn('Supabase activity log exception:', err);
  }
}

// Test Connection Helper
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const testClient = createClient(url.trim(), anonKey.trim());
    const { count, error } = await testClient
      .from('guests')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Connected successfully! Found ${count ?? 0} guest records in database.`,
      count: count ?? 0,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection exception: ${err.message || 'Unknown network error'}`,
    };
  }
}
