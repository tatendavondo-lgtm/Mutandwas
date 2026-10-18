export type RSVPStatus = 'accepted' | 'declined' | 'pending';
export type CheckInStatus = 'checked_in' | 'not_checked_in';

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  inviteCode: string;
  ticketCode: string; // 4-digit pass code for fast gate check-in
  rsvpStatus: RSVPStatus;
  partySize: number; // Max allowed party size
  confirmedHeadcount: number; // Actual attending headcount
  plusOneName?: string;
  dietaryRequirements: string;
  songRequest?: string;
  notes?: string;
  isVIP?: boolean;
  inviteType?: 'family' | 'individual'; // 'family' for open/general link, 'individual' for single-use personalized tokens
  checkInStatus: CheckInStatus;
  checkInTime?: string;
  checkedInBy?: string;
  checkInHistory?: {
    timestamp: string;
    gate: string;
    headcount: number;
  }[];
}

export interface VenueZone {
  id: string;
  name: string;
  type: 'ceremony' | 'reception' | 'cocktails' | 'parking' | 'photo';
  time: string;
  description: string;
  capacity: number;
  dressCodeTip: string;
  xCoord: number; // Percentage on map (0-100)
  yCoord: number;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  type: 'check_in' | 'duplicate_attempt' | 'rsvp_updated';
  guestName: string;
  details: string;
  severity?: 'success' | 'warning' | 'info';
}

export interface WeddingConfig {
  coupleNames: string;
  partner1: string;
  partner1Title: string; // "first born of Mr & Mrs Matiza"
  partner2: string;
  partner2Title: string; // "third born of Mr & Mrs Chakawora"
  hostingWording: string;
  weddingDate: string; // ISO date
  rsvpDeadline: string;
  venueName: string;
  venueAddress: string;
  venueCapacity: number;
  gatePin: string;
  adminPin: string;
  attire: string;
  specialInstructions: string;
  contactEmail: string;
  contactPhone: string;
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
}
