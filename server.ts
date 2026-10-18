import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.NODE_ENV === 'production' ? (Number(process.env.PORT) || 3000) : 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '50mb' }));

export interface RSVPValidationPayload {
  existingId?: string;
  name?: string;
  email?: string;
  phone?: string;
  rsvpStatus?: 'accepted' | 'declined';
  attendanceStatus?: 'accepted' | 'declined';
  partySize?: number;
  confirmedHeadcount?: number;
  headcount?: number;
  plusOneName?: string;
  dietaryRequirements?: string;
  songRequest?: string;
  notes?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  message: string;
  sanitized?: {
    name: string;
    email: string;
    phone?: string;
    rsvpStatus: 'accepted' | 'declined';
    confirmedHeadcount: number;
    plusOneName?: string;
    dietaryRequirements: string;
    songRequest?: string;
    notes?: string;
  };
}

/**
 * Server-side validation logic for wedding RSVPs
 */
export function validateRSVPData(data: RSVPValidationPayload): ValidationResult {
  const errors: Record<string, string> = {};

  // 1. Validate Full Name
  const rawName = (data.name || '').trim();
  if (!rawName) {
    errors.name = 'Full name is required.';
  } else if (rawName.length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  } else if (rawName.length > 80) {
    errors.name = 'Full name cannot exceed 80 characters.';
  } else if (!/^[a-zA-Z\s.'’\-&]+$/.test(rawName)) {
    errors.name = 'Full name contains invalid characters.';
  }

  // 2. Validate Attendance Status
  const status = data.rsvpStatus || data.attendanceStatus;
  if (!status) {
    errors.attendanceStatus = 'Please select whether you will be attending.';
  } else if (status !== 'accepted' && status !== 'declined') {
    errors.attendanceStatus = 'Invalid attendance status. Must be accepted or declined.';
  }

  // 3. Validate Headcount & Plus-One
  const headcount = Number(data.confirmedHeadcount ?? data.headcount ?? 1);
  if (status === 'accepted') {
    if (isNaN(headcount) || headcount < 1) {
      errors.headcount = 'Confirmed headcount must be at least 1 guest.';
    } else if (headcount > 4) {
      errors.headcount = 'Maximum party size is 4 guests for this invitation.';
    }

    // Plus-One validation
    if (headcount > 1) {
      const rawPlusOne = (data.plusOneName || '').trim();
      if (!rawPlusOne) {
        errors.plusOneName = 'Please provide the full name of your accompanying guest.';
      } else if (rawPlusOne.length < 2) {
        errors.plusOneName = 'Accompanying guest name must be at least 2 characters.';
      }
    }

    // 4. Validate Dietary Requirements
    const rawDietary = (data.dietaryRequirements || '').trim();
    if (!rawDietary) {
      errors.dietaryRequirements = 'Dietary requirements are required. Enter any allergies, halal, vegetarian, or "None".';
    } else if (rawDietary.length < 2) {
      errors.dietaryRequirements = 'Dietary requirements must be at least 2 characters (e.g., "None").';
    } else if (rawDietary.length > 200) {
      errors.dietaryRequirements = 'Dietary requirements cannot exceed 200 characters.';
    }
  }

  // 5. Validate Phone (optional but if provided must be realistic)
  const rawPhone = (data.phone || '').trim();
  if (rawPhone) {
    const cleanedDigits = rawPhone.replace(/\D/g, '');
    if (cleanedDigits.length < 7 || cleanedDigits.length > 15) {
      errors.phone = 'Please provide a valid phone/WhatsApp number with area/country code (7-15 digits).';
    }
  }

  // 6. Validate Email (optional but if provided must follow format)
  const rawEmail = (data.email || '').trim();
  if (rawEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  if (!isValid) {
    const firstErrorMessage = Object.values(errors)[0];
    return {
      valid: false,
      errors,
      message: firstErrorMessage || 'Server validation failed. Please check the required fields.',
    };
  }

  return {
    valid: true,
    errors: {},
    message: 'Server validation passed successfully.',
    sanitized: {
      name: rawName,
      email: rawEmail || `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}@guest.vows`,
      phone: rawPhone || undefined,
      rsvpStatus: status as 'accepted' | 'declined',
      confirmedHeadcount: status === 'accepted' ? headcount : 0,
      plusOneName: status === 'accepted' && headcount > 1 ? (data.plusOneName || '').trim() : undefined,
      dietaryRequirements: status === 'accepted' ? (data.dietaryRequirements || '').trim() : 'N/A',
      songRequest: (data.songRequest || '').trim(),
      notes: (data.notes || '').trim(),
    },
  };
}

/**
 * API Route: Validate RSVP payload without submitting
 */
app.post('/api/rsvp/validate', (req: Request, res: Response) => {
  const validation = validateRSVPData(req.body);
  if (!validation.valid) {
    return res.status(400).json(validation);
  }
  return res.status(200).json(validation);
});

/**
 * API Route: Validate and process RSVP submission
 */
app.post('/api/rsvp/submit', (req: Request, res: Response) => {
  const validation = validateRSVPData(req.body);
  if (!validation.valid) {
    return res.status(400).json(validation);
  }

  // Generate verified server ticket code if not already assigned
  const ticketCode = Math.floor(1000 + Math.random() * 9000).toString();

  return res.status(200).json({
    success: true,
    message: 'RSVP validated and accepted by server.',
    ticketCode,
    validatedData: validation.sanitized,
  });
});

/**
 * API Route: Upload and persist exact user portrait
 */
app.post('/api/upload-portrait', (req: Request, res: Response) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Missing dataUrl' });
    }
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const imagesDirPublic = path.resolve(__dirname, 'public/assets/images');
    const imagesDirSrc = path.resolve(__dirname, 'src/assets/images');
    fs.mkdirSync(imagesDirPublic, { recursive: true });
    fs.mkdirSync(imagesDirSrc, { recursive: true });

    fs.writeFileSync(path.resolve(imagesDirPublic, 'user_uploaded_portrait.jpg'), buffer);
    fs.writeFileSync(path.resolve(imagesDirSrc, 'user_uploaded_portrait.jpg'), buffer);

    return res.status(200).json({
      success: true,
      url: '/assets/images/user_uploaded_portrait.jpg',
    });
  } catch (err: any) {
    console.error('Failed to save uploaded portrait:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Mount Vite in development or static dist in production
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] Wedding app listening on port ${PORT}`);
  });
}

startServer();
