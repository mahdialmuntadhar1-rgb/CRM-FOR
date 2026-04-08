import { Contact } from '../types/crm';
import { normalizeIraqiPhone as normalizePipelinePhone } from './phonePipeline';

export function normalizeBusinessName(original: string | null | undefined): string | null {
  if (!original) return null;
  const cleaned = original.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}

export interface PhoneNormalizationResult {
  normalized: string | null;
  isValid: boolean;
  reason: string | null;
}

export function normalizeIraqiPhone(raw: string | null | undefined): PhoneNormalizationResult {
  const result = normalizePipelinePhone(raw);
  return {
    normalized: result.normalized,
    isValid: result.isValid,
    reason: result.reason,
  };
}

export function renderTemplate(templateBody: string, contact: Partial<Contact>): string {
  const vars: Record<string, string> = {
    business_name: contact.display_name || contact.original_name || 'صاحب النشاط',
    governorate: contact.governorate || 'العراق',
    category: contact.category || 'نشاطك',
  };

  return templateBody.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => vars[key] ?? '');
}

export function computeNormalizationStats(contacts: Contact[]) {
  const seen = new Set<string>();
  let duplicates = 0;

  contacts.forEach((contact) => {
    if (contact.normalized_phone) {
      if (seen.has(contact.normalized_phone)) duplicates += 1;
      else seen.add(contact.normalized_phone);
    }
  });

  return {
    total: contacts.length,
    valid: contacts.filter((c) => c.is_phone_valid).length,
    invalid: contacts.filter((c) => !c.is_phone_valid).length,
    duplicates,
  };
}
