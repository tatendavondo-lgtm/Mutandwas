import { Guest, VenueZone, WeddingConfig, ActivityLogItem } from '../types/wedding';

export const INITIAL_WEDDING_CONFIG: WeddingConfig = {
  coupleNames: 'Tinashey Mutandwa & Samukelisiwe Sibanda',
  partner1: 'Tinashey Mutandwa',
  partner1Title: '',
  partner2: 'Samukelisiwe Sibanda',
  partner2Title: '',
  hostingWording: 'Joyfully invite you to celebrate our union in marriage on 21 December 2026',
  weddingDate: '2026-12-21T00:00:00Z',
  rsvpDeadline: '2026-12-07T23:59:59Z', // First week of December
  venueName: 'Life Celebrations Center',
  venueAddress: '851 Goodhope Road, Harare',
  venueCapacity: 300,
  gatePin: '4389',
  adminPin: '9172',
  attire: 'Olive Green & Cream',
  specialInstructions: 'Adults only, strictly no kids & strictly by invitation',
  contactEmail: 'rsvp@tinasheyandsamukelisiwe.com',
  contactPhone: '+263 77 245 8891',
  backgroundImageUrl: '/assets/images/couple_portrait.jpg',
  backgroundOpacity: 0.22,
};

// Initial guests list starts completely fresh and empty
export const INITIAL_GUESTS: Guest[] = [];

export const INITIAL_VENUE_ZONES: VenueZone[] = [
  {
    id: 'zone-1',
    name: 'Main Celebration Auditorium & Lawn',
    type: 'ceremony',
    time: 'Celebration',
    description: 'Picturesque ceremony setting at Life Celebrations Center. Unplugged holy matrimony.',
    capacity: 300,
    dressCodeTip: 'Olive Green & Cream attire.',
    xCoord: 55,
    yCoord: 62,
  },
  {
    id: 'zone-2',
    name: 'Cocktail Terraces & Lawn',
    type: 'cocktails',
    time: 'Celebration',
    description: 'Celebratory toasts, artisanal refreshments, and bridal party photographs.',
    capacity: 300,
    dressCodeTip: 'Olive Green & Cream formal',
    xCoord: 35,
    yCoord: 66,
  },
  {
    id: 'zone-3',
    name: 'The Banquet Suite',
    type: 'reception',
    time: 'Celebration',
    description: 'Lavish wedding banquet, dinner feast, speeches, cake cutting, and evening celebration.',
    capacity: 300,
    dressCodeTip: 'Formal reception',
    xCoord: 76,
    yCoord: 44,
  },
  {
    id: 'zone-4',
    name: 'Goodhope Road Security Gate & Parking',
    type: 'parking',
    time: 'Guest Arrival',
    description: 'Dedicated security entrance on Goodhope Road and single-use 4-digit/QR pass check-in station.',
    capacity: 120,
    dressCodeTip: 'Security Gate Check-in Point',
    xCoord: 90,
    yCoord: 54,
  },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [];
