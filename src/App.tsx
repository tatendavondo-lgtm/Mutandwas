import { useState, useEffect, useCallback } from 'react';
import { Guest, WeddingConfig, ActivityLogItem } from './types/wedding';
import {
  getWeddingConfig,
  saveWeddingConfig,
  getGuests,
  getActivityLogs,
  subscribeRealTime,
  STORAGE_KEYS,
  getDeviceRegisteredGuest,
  setDeviceRegisteredGuest,
} from './services/weddingStorage';
import {
  isSupabaseConfigured,
  isSupabaseWriteInFlight,
  fetchGuestsFromSupabase,
  fetchActivityLogsFromSupabase,
  subscribeToGuestsRealtime,
  subscribeToActivityLogsRealtime,
} from './services/supabase';
import { Navigation } from './components/Navigation';
import { InvitationCard } from './components/InvitationCard';
import { EventMap } from './components/EventMap';
import { GateScanner } from './components/GateScanner';
import { AdminDashboard } from './components/AdminDashboard';
import { RSVPModal } from './components/RSVPModal';
import { QRPassModal } from './components/QRPassModal';
import { EnvelopeUnveil, requestNativeFullscreen } from './components/EnvelopeUnveil';

export default function App() {
  const [config, setConfig] = useState<WeddingConfig>(getWeddingConfig());
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  // Active view: default to 'invitation'
  const [currentView, setCurrentView] = useState<
    'invitation' | 'map' | 'pass' | 'gate' | 'admin'
  >('invitation');

  // Currently viewed guest (for personalized link or pass preview; remembered on this device)
  const [activeGuest, setActiveGuest] = useState<Guest | null>(() => {
    return getDeviceRegisteredGuest();
  });

  // Envelope Unveil state (triggers native mobile fullscreen on guest tap)
  const [isEnvelopeOpened, setIsEnvelopeOpened] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isStaffPortal =
        params.get('portal') ||
        params.get('admin') ||
        params.get('gate') ||
        params.get('view') === 'admin' ||
        params.get('view') === 'gate';
      if (isStaffPortal) return true;
      // If someone is arriving via an invitation link (?token=... or ?guest=... or fresh view), ALWAYS present the envelope!
      if (
        params.get('token') ||
        params.get('guest') ||
        params.get('invite') ||
        params.get('type') ||
        !params.get('view') ||
        params.get('view') === 'invitation'
      ) {
        return false;
      }
      return sessionStorage.getItem('wedding_envelope_opened') === 'true';
    } catch {
      return false;
    }
  });

  // Modals
  const [isRSVPOpen, setIsRSVPOpen] = useState(false);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [passTargetGuest, setPassTargetGuest] = useState<Guest | null>(null);

  // Secret Staff Portal Lock state (Separated for Gate and Admin)
  const [isGateUnlocked, setIsGateUnlocked] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Refresh data EXCLUSIVELY from Supabase database (Single Source of Truth)
  const refreshData = useCallback(async () => {
    setConfig(getWeddingConfig());

    if (isSupabaseConfigured()) {
      const [cloudGuests, cloudLogs] = await Promise.all([
        fetchGuestsFromSupabase(),
        fetchActivityLogsFromSupabase(),
      ]);

      if (cloudGuests !== null) {
        setAllGuests(cloudGuests);
        try {
          localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(cloudGuests));
        } catch (e) {
          console.error(e);
        }
        setActiveGuest((prev) => {
          const current = prev || getDeviceRegisteredGuest();
          if (!current) return null;
          const updated = cloudGuests.find(
            (g) => g.id === current.id || (current.ticketCode && g.ticketCode === current.ticketCode)
          );
          if (!updated) return current;
          setDeviceRegisteredGuest(updated);
          return updated;
        });
      } else {
        setAllGuests([]);
      }

      if (cloudLogs !== null) {
        setActivityLogs(cloudLogs);
        try {
          localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(cloudLogs));
        } catch (e) {
          console.error(e);
        }
      } else {
        setActivityLogs([]);
      }
    } else {
      setAllGuests([]);
      setActivityLogs([]);
    }
  }, []);

  // Initial Supabase cloud sync + continuous live polling so Admin & Gate always reflect DB state
  useEffect(() => {
    // Purge any legacy browser caches from previous versions
    try {
      localStorage.removeItem('aura_vows_guests_v5');
      localStorage.removeItem('aura_vows_activity_v5');
      localStorage.removeItem('aura_vows_guests_v4');
      localStorage.removeItem('aura_vows_guests_v3');
    } catch {}

    void refreshData();

    const interval = setInterval(() => {
      // Don't poll while user is filling out RSVP or while write is in flight
      if (isSupabaseConfigured() && !isSupabaseWriteInFlight() && !isRSVPOpen) {
        void refreshData();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [refreshData, isRSVPOpen]);

  // Whenever switching to Gate or Admin view, immediately pull latest data from Supabase
  useEffect(() => {
    if (currentView === 'gate' || currentView === 'admin') {
      void refreshData();
    }
  }, [currentView, refreshData]);

  // Subscribe to cross-tab real-time sync (BroadcastChannel + storage event + Supabase Realtime)
  useEffect(() => {
    const unsubscribeBroadcast = subscribeRealTime((event) => {
      if (event.type === 'GUESTS_UPDATED') {
        setAllGuests(event.payload);
        setActiveGuest((prev) => {
          if (!prev) return null;
          return event.payload.find((g) => g.id === prev.id) || prev;
        });
      } else if (event.type === 'ACTIVITY_LOGGED') {
        setActivityLogs((prev) => {
          if (prev.some((item) => item.id === event.payload.id)) return prev;
          return [event.payload, ...prev.slice(0, 49)];
        });
      }
    });

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.GUESTS && e.newValue) {
        try {
          const parsed: Guest[] = JSON.parse(e.newValue);
          setAllGuests(parsed);
        } catch {
          // ignore
        }
      } else if (e.key === STORAGE_KEYS.ACTIVITY && e.newValue) {
        try {
          const parsed: ActivityLogItem[] = JSON.parse(e.newValue);
          setActivityLogs(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Supabase realtime subscription for cross-device sync (NEVER re-upserts back to Supabase!)
    const unsubscribeSupabaseGuests = isSupabaseConfigured()
      ? subscribeToGuestsRealtime((updatedGuest) => {
          setAllGuests((prev) => {
            const next = [...prev];
            const idx = next.findIndex((g) => g.id === updatedGuest.id);
            if (idx >= 0) {
              next[idx] = updatedGuest;
            } else {
              next.push(updatedGuest);
            }
            try {
              localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });
          setActiveGuest((prev) =>
            prev && prev.id === updatedGuest.id ? updatedGuest : prev
          );
        })
      : null;

    const unsubscribeSupabaseLogs = isSupabaseConfigured()
      ? subscribeToActivityLogsRealtime((newLog) => {
          setActivityLogs((prev) => {
            if (prev.some((item) => item.id === newLog.id)) return prev;
            const next = [newLog, ...prev.slice(0, 49)];
            try {
              localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          });
        })
      : null;

    return () => {
      unsubscribeBroadcast();
      window.removeEventListener('storage', handleStorageEvent);
      if (unsubscribeSupabaseGuests) unsubscribeSupabaseGuests();
      if (unsubscribeSupabaseLogs) unsubscribeSupabaseLogs();
    };
  }, []);

  // Parse URL search parameters once on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const portalParam = params.get('portal') || params.get('admin') || params.get('gate');

    if (portalParam || viewParam === 'admin' || viewParam === 'gate') {
      setIsEnvelopeOpened(true);
      setIsPinModalOpen(true);
    }

    if (params.get('rsvp') === 'true') {
      setIsEnvelopeOpened(true);
      setIsRSVPOpen(true);
    }

    if (viewParam && ['invitation', 'map', 'pass'].includes(viewParam)) {
      setIsEnvelopeOpened(true);
      setCurrentView(viewParam as any);
    }
  }, []);

  // Resolve guest/token parameter when guest list updates or from device storage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guestParam = params.get('token') || params.get('guest') || params.get('invite');
    if (guestParam && allGuests.length > 0) {
      const found = allGuests.find(
        (g) =>
          g.inviteCode.toLowerCase() === guestParam.toLowerCase() ||
          g.ticketCode.toLowerCase() === guestParam.toLowerCase() ||
          g.id.toLowerCase() === guestParam.toLowerCase()
      );
      if (found) {
        setActiveGuest(found);
        setDeviceRegisteredGuest(found);
        return;
      }
    }

    // If no query parameter, check if this device has already registered an RSVP
    const deviceSaved = getDeviceRegisteredGuest();
    if (deviceSaved) {
      if (allGuests.length > 0) {
        const foundInList = allGuests.find(
          (g) => g.id === deviceSaved.id || (deviceSaved.ticketCode && g.ticketCode === deviceSaved.ticketCode)
        );
        if (foundInList) {
          setActiveGuest(foundInList);
          setDeviceRegisteredGuest(foundInList);
        } else {
          setActiveGuest(deviceSaved);
        }
      } else {
        setActiveGuest(deviceSaved);
      }
    }
  }, [allGuests]);

  const handleOpenPass = (guest?: Guest) => {
    const target = guest || activeGuest || getDeviceRegisteredGuest();
    if (target) {
      setActiveGuest(target);
      setPassTargetGuest(target);
    }
    setIsPassOpen(true);
  };

  const handleVerifyStaffPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = enteredPin.trim();

    const adminPin = config.adminPin || '9172';
    const gatePin = config.gatePin || '4389';

    if (cleanPin === adminPin) {
      setIsAdminUnlocked(true);
      setIsPinModalOpen(false);
      setEnteredPin('');
      setPinError('');
      setCurrentView('admin');
    } else if (cleanPin === gatePin) {
      setIsGateUnlocked(true);
      setIsPinModalOpen(false);
      setEnteredPin('');
      setPinError('');
      setCurrentView('gate');
    } else {
      setPinError('Invalid Security PIN. Please try again.');
    }
  };

  const handleOpenEnvelope = () => {
    setIsEnvelopeOpened(true);
    try {
      sessionStorage.setItem('wedding_envelope_opened', 'true');
    } catch {
      // ignore
    }
  };

  const checkedInCount = allGuests.filter((g) => g.checkInStatus === 'checked_in').length;

  const currentBackdropUrl = config.backgroundImageUrl && !config.backgroundImageUrl.includes('aistudio.google.com')
    ? config.backgroundImageUrl
    : '/assets/images/couple_portrait.jpg';

  return (
    <div className="min-h-screen bg-[#EFE7D8] text-[#24301C] flex flex-col font-sans selection:bg-[#545E46] selection:text-[#FAF5EA] safe-pb relative overflow-x-hidden">
      {/* Visible romantic couple backdrop across the entire page */}
      {currentView !== 'gate' && currentView !== 'admin' && (
        <>
          <div
            className="fixed inset-0 pointer-events-none select-none z-0 scale-105"
            style={{
              backgroundImage: `url(${currentBackdropUrl})`,
              backgroundPosition: 'center 20%',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              opacity: 0.30,
            }}
          />
          <div className="fixed inset-0 bg-gradient-to-b from-[#EFE7D8]/60 via-[#EFE7D8]/70 to-[#EFE7D8]/80 pointer-events-none z-0" />
        </>
      )}

      {/* Native Fullscreen Wax-Seal Envelope Unveil Screen */}
      {!isEnvelopeOpened && currentView === 'invitation' && !isGateUnlocked && !isAdminUnlocked && (
        <EnvelopeUnveil
          config={config}
          activeGuest={activeGuest}
          onOpen={handleOpenEnvelope}
        />
      )}

      {/* Navigation (Cleanly for guests; Clicking top-left B&R prompts PIN) */}
      <Navigation
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'pass') {
            handleOpenPass();
          } else {
            setCurrentView(view);
          }
        }}
        activeGuest={activeGuest}
        allGuests={allGuests}
        onOpenRSVP={() => setIsRSVPOpen(true)}
        onOpenStaffModal={() => {
          setEnteredPin('');
          setPinError('');
          setIsPinModalOpen(true);
        }}
        isGateUnlocked={isGateUnlocked}
        isAdminUnlocked={isAdminUnlocked}
        onLockGate={() => {
          setIsGateUnlocked(false);
          setCurrentView('invitation');
        }}
        onLockAdmin={() => {
          setIsAdminUnlocked(false);
          setCurrentView('invitation');
        }}
        checkedInCount={checkedInCount}
        config={config}
      />

      {/* Main Content Area */}
      <main className={`flex-1 pb-12 sm:pb-16 relative z-10 ${
        (currentView === 'gate' || currentView === 'admin') ? 'bg-[#F4F1EA] text-stone-900 min-h-screen py-4' : ''
      }`}>
        {currentView === 'invitation' && (
          <InvitationCard
            config={config}
            activeGuest={activeGuest}
            onOpenRSVP={() => setIsRSVPOpen(true)}
            onOpenPass={() => handleOpenPass()}
            onNavigate={(view) => {
              if (view === 'pass') handleOpenPass();
              else setCurrentView(view);
            }}
          />
        )}

        {currentView === 'map' && (
          <EventMap config={config} />
        )}

        {currentView === 'gate' && isGateUnlocked && (
          <GateScanner
            config={config}
            allGuests={allGuests}
            isUnlocked={true}
            onSetUnlocked={(unlocked) => {
              if (!unlocked) {
                setIsGateUnlocked(false);
                setCurrentView('invitation');
              }
            }}
            onGuestUpdated={refreshData}
          />
        )}

        {currentView === 'admin' && isAdminUnlocked && (
          <AdminDashboard
            config={config}
            allGuests={allGuests}
            activityLogs={activityLogs}
            onRefreshData={refreshData}
            onViewGuestPass={(guest) => handleOpenPass(guest)}
            onNavigateToGate={() => {
              if (isGateUnlocked) {
                setCurrentView('gate');
              } else {
                setEnteredPin('');
                setPinError('');
                setIsPinModalOpen(true);
              }
            }}
            onUpdateConfig={(newConfig) => {
              saveWeddingConfig(newConfig);
              setConfig(newConfig);
            }}
          />
        )}
      </main>

      {/* RSVP Self-Registration Modal */}
      <RSVPModal
        guest={activeGuest}
        isOpen={isRSVPOpen}
        onClose={() => setIsRSVPOpen(false)}
        onRSVPSaved={(updated) => {
          setActiveGuest(updated);
          setDeviceRegisteredGuest(updated);
          setPassTargetGuest(updated);
          refreshData();
        }}
        onOpenPass={(savedGuest) => {
          setActiveGuest(savedGuest);
          setDeviceRegisteredGuest(savedGuest);
          setPassTargetGuest(savedGuest);
          setIsPassOpen(true);
        }}
      />

      {/* Digital QR Entry Pass Modal */}
      <QRPassModal
        guest={passTargetGuest || activeGuest || getDeviceRegisteredGuest()}
        config={config}
        isOpen={isPassOpen}
        onClose={() => setIsPassOpen(false)}
        onOpenRSVP={() => setIsRSVPOpen(true)}
      />

      {/* Unified Staff Security PIN Modal (Opens either Gate or Admin depending on which PIN is entered) */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-sm safe-pb safe-pt">
          <div className="bg-[#FFFDF9] border border-[#B5C7A4] rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-sm w-full space-y-4 sm:space-y-5 text-center text-stone-900 shadow-2xl">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#A0B98A] bg-[#F2F6ED] mx-auto flex items-center justify-center text-base sm:text-lg">
              🛡️
            </div>

            <div className="space-y-1.5">
              <h3 className="font-cinzel text-sm sm:text-base font-bold text-[#202C1B] tracking-wider uppercase">
                Staff Security Access
              </h3>
              <p className="text-xs font-serif-luxury text-stone-600">
                Enter your security PIN. Entering the <strong className="text-[#3F522F] font-bold">Gate PIN</strong> unlocks the Express Terminal, while entering the <strong className="text-[#3F522F] font-bold">Admin PIN</strong> unlocks the Admin Hub.
              </p>
            </div>

            <form onSubmit={handleVerifyStaffPin} className="space-y-4">
              <input
                type="password"
                maxLength={6}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError('');
                }}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-2.5 bg-[#F9F7F2] border border-[#BACBB0] focus:border-[#4B6237] rounded-xl text-stone-900 focus:outline-none placeholder:tracking-normal placeholder:font-sans placeholder:text-stone-400 placeholder:text-base"
                autoFocus
              />

              {pinError && (
                <p className="text-xs text-rose-500 font-medium">{pinError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setEnteredPin('');
                    setPinError('');
                  }}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 btn-olive-luxury text-xs font-bold rounded-xl cursor-pointer font-cinzel tracking-wider uppercase shadow-md"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subtle Wedding Footer in Rich Cream & Olive Green */}
      <footer className="bg-[#E7DDC7] border-t border-[#C7B99D] py-6 sm:py-8 px-4 text-center text-xs text-[#48533C] space-y-2.5 no-print">
        <p className="font-wedding italic text-3xl sm:text-5xl text-[#26331C] leading-tight pt-1 font-semibold">
          {config.coupleNames}
        </p>
        <p className="font-serif-luxury text-[#48533C] text-[11px] sm:text-xs tracking-wider">
          Monday, 21 December 2026 · {config.venueName} · 851 Goodhope Road
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-[#4D633E] pt-2 font-cinzel flex-wrap font-medium">
          <button
            onClick={() => setCurrentView('invitation')}
            className="hover:text-[#202C1B] cursor-pointer py-1"
          >
            Invitation
          </button>
          <span>·</span>
          <button
            onClick={() => setCurrentView('map')}
            className="hover:text-[#202C1B] cursor-pointer py-1"
          >
            Venue
          </button>
          <span>·</span>
          <button
            onClick={() => handleOpenPass()}
            className="hover:text-[#202C1B] cursor-pointer py-1"
          >
            Entry Pass
          </button>
          <span>·</span>
          <button
            onClick={() => setIsEnvelopeOpened(false)}
            className="hover:text-[#202C1B] cursor-pointer py-1"
          >
            Envelope
          </button>
        </div>
      </footer>
    </div>
  );
}
