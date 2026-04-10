// =====================================================
// Phone Number Normalization - Iraqi Numbers
// =====================================================

export interface NormalizationResult {
  normalized: string | null;
  isValid: boolean;
  reason?: string;
}

const IRAQI_MOBILE_PREFIXES = ['770', '771', '772', '773', '774', '775', '776', '777', '778', '779', '780', '781', '782', '783', '784', '785', '786', '787', '788', '789', '790', '791'];

/**
 * Normalize Iraqi phone number to E.164 format (+964XXXXXXXXXX)
 */
export function normalizePhone(phone: string): NormalizationResult {
  if (!phone || typeof phone !== 'string') {
    return { normalized: null, isValid: false, reason: 'Empty or invalid input' };
  }

  // Keep track if original had + sign
  const hasPlus = phone.trim().startsWith('+');
  
  // Strip all non-numeric characters
  let digits = phone.replace(/\D/g, '');
  
  if (!digits) {
    return { normalized: null, isValid: false, reason: 'No digits found' };
  }

  // Handle local Iraqi formats
  // Format: 07XX XXX XXXX (11 digits starting with 07)
  if (digits.startsWith('07') && digits.length === 11) {
    const withoutLeadingZero = digits.substring(1); // Remove the 0
    const normalized = '+964' + withoutLeadingZero;
    return validateIraqiNumber(normalized);
  }

  // Format: 7XX XXX XXXX (10 digits starting with 7)
  if (digits.startsWith('7') && digits.length === 10) {
    const normalized = '+964' + digits;
    return validateIraqiNumber(normalized);
  }

  // Format: 9647XX XXX XXXX (12-13 digits with country code)
  if (digits.startsWith('964') && digits.length === 12) {
    const normalized = '+' + digits;
    return validateIraqiNumber(normalized);
  }

  // Already has +964 prefix in digits
  if (digits.startsWith('9647') && digits.length === 13) {
    const normalized = '+' + digits;
    return validateIraqiNumber(normalized);
  }

  // Handle international format with + sign originally present
  if (hasPlus && digits.length >= 11) {
    const normalized = '+' + digits;
    return validateIraqiNumber(normalized);
  }

  return { 
    normalized: null, 
    isValid: false, 
    reason: `Unsupported format: ${digits.length} digits, starts with ${digits.slice(0, 3)}` 
  };
}

/**
 * Validate normalized Iraqi mobile number
 */
function validateIraqiNumber(normalized: string): NormalizationResult {
  // Must be +964 followed by 10 digits
  if (!normalized.match(/^\+964\d{10}$/)) {
    return { 
      normalized: null, 
      isValid: false, 
      reason: 'Invalid length or format for Iraqi number' 
    };
  }

  // Check mobile prefix (3 digits after +964)
  const prefix = normalized.slice(4, 7);
  
  if (!IRAQI_MOBILE_PREFIXES.includes(prefix)) {
    return { 
      normalized, 
      isValid: false, 
      reason: `Invalid or unsupported mobile prefix: ${prefix}` 
    };
  }

  return { normalized, isValid: true };
}

/**
 * Strip + for APIs that don't accept it
 */
export function stripPlus(phone: string): string {
  if (phone.startsWith('+')) {
    return phone.substring(1);
  }
  return phone;
}

/**
 * Format phone for display (+964 770 123 4567)
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized.isValid || !normalized.normalized) {
    return phone; // Return original if can't normalize
  }
  
  const p = normalized.normalized;
  // +964 770 123 4567
  return `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7, 10)} ${p.slice(10)}`;
}

/**
 * Detect if number is likely a landline (not suitable for WhatsApp)
 */
export function isLikelyLandline(phone: string): boolean {
  const normalized = normalizePhone(phone);
  if (!normalized.isValid || !normalized.normalized) {
    return false; // Can't determine
  }
  
  // Iraqi landlines: +964 21 XXXX XXXX (Baghdad), +964 24 XXXX XXXX (Basra), etc.
  const prefix = normalized.normalized.slice(4, 6);
  const landlinePrefixes = ['21', '22', '23', '24', '25', '30', '32', '33', '36', '37', '40', '42', '43', '50'];
  
  return landlinePrefixes.includes(prefix);
}

/**
 * Batch normalize phones from import
 */
export interface BatchNormalizationResult {
  results: Map<string, NormalizationResult>;
  valid: string[];
  invalid: Array<{ original: string; reason: string }>;
  duplicates: string[];
}

export function batchNormalizePhones(phones: string[]): BatchNormalizationResult {
  const results = new Map<string, NormalizationResult>();
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: Array<{ original: string; reason: string }> = [];
  const duplicates: string[] = [];

  for (const phone of phones) {
    const trimmed = phone.trim();
    if (!trimmed) continue;

    const result = normalizePhone(trimmed);
    results.set(trimmed, result);

    if (!result.isValid || !result.normalized) {
      invalid.push({ original: trimmed, reason: result.reason || 'Unknown error' });
      continue;
    }

    if (seen.has(result.normalized)) {
      duplicates.push(trimmed);
      continue;
    }

    seen.add(result.normalized);
    valid.push(result.normalized);
  }

  return { results, valid, invalid, duplicates };
}

/**
 * Check if contact is opted out based on phone
 */
export function isOptOutKeyword(message: string): boolean {
  if (!message) return false;
  
  const lower = message.toLowerCase().trim();
  const optOutKeywords = [
    'stop', 'إلغاء', 'الغاء', 'لا ترسل', 'لا تبعتلي', 'unsubscribe',
    'cancel', 'remove', 'خارج', '.block', 'منع', 'حظر'
  ];
  
  return optOutKeywords.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Detect simple intents from reply text
 */
export function detectIntent(text: string): { intent: string; confidence: number } {
  const lower = text.toLowerCase().trim();
  
  // Interested patterns
  const interested = ['نعم', 'yes', 'مهتم', 'اريد', 'أريد', 'حاب', 'احب', 'حابب', 'details', 'تفاصيل', 'معلومات', 'more', 'اكثر'];
  if (interested.some(kw => lower.includes(kw))) {
    return { intent: 'interested', confidence: 0.9 };
  }
  
  // Stop/Opt-out patterns
  if (isOptOutKeyword(text)) {
    return { intent: 'stop', confidence: 0.95 };
  }
  
  // Price questions
  const price = ['price', 'سعر', 'فلوس', 'كلفة', 'تكلفة', 'cost', 'how much', 'بكم', 'شقد'];
  if (price.some(kw => lower.includes(kw))) {
    return { intent: 'ask_price', confidence: 0.8 };
  }
  
  // Claim listing
  const claim = ['claim', 'ملكي', 'تعديل', 'عدل', 'صحح', 'edit', 'update', 'my page', 'صفحتي'];
  if (claim.some(kw => lower.includes(kw))) {
    return { intent: 'claim_listing', confidence: 0.8 };
  }
  
  // Not now
  const notNow = ['not now', 'مو هسه', 'مو هسا', 'بعدين', 'later', 'وقت', 'now is not', 'busy', 'مشغول'];
  if (notNow.some(kw => lower.includes(kw))) {
    return { intent: 'not_now', confidence: 0.7 };
  }
  
  return { intent: 'unknown', confidence: 0.5 };
}
