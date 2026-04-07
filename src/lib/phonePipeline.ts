export const IRAQ_COUNTRY_CODE = '964';
export const IRAQ_MOBILE_PREFIX = '7';
export const IRAQ_LOCAL_LENGTH = 11; // 07XXXXXXXXX
export const IRAQ_INTL_LENGTH = 13; // 9647XXXXXXXXX

export type PhoneFieldName = 'whatsapp' | 'phone' | 'phone1' | 'phone2' | 'phone_1' | 'phone_2';

export interface NormalizedPhoneResult {
  input: string | null | undefined;
  normalized: string | null;
  isValid: boolean;
  reason: string | null;
}

export interface SelectedPhoneResult {
  selectedPhone: string | null;
  phoneSource: PhoneFieldName | null;
  isValid: boolean;
  invalidReason: string | null;
  normalizationByField: Record<PhoneFieldName, NormalizedPhoneResult>;
}

export type BusinessPhoneFields = Partial<Record<PhoneFieldName, string | null>>;

const DEFAULT_INVALID_REASON = 'missing_phone_value';

export function normalizeIraqiPhone(input: string | null | undefined): NormalizedPhoneResult {
  if (!input || input.trim().length === 0) {
    return { input, normalized: null, isValid: false, reason: DEFAULT_INVALID_REASON };
  }

  const trimmed = input.trim();
  const sanitized = trimmed.replace(/[^\d+]/g, '');
  const plusCount = (sanitized.match(/\+/g) || []).length;

  if (plusCount > 1 || (plusCount === 1 && !sanitized.startsWith('+'))) {
    return { input, normalized: null, isValid: false, reason: 'malformed_plus_symbol' };
  }

  const digitsOnly = sanitized.replace(/\D/g, '');
  if (!digitsOnly) {
    return { input, normalized: null, isValid: false, reason: 'no_digits' };
  }

  const normalizedDigits = digitsOnly.replace(/^(00)+/, '');
  const normalizedSingleCountry = normalizedDigits.replace(/^(964)+/, IRAQ_COUNTRY_CODE);

  if (normalizedSingleCountry.startsWith('0')) {
    if (normalizedSingleCountry.length !== IRAQ_LOCAL_LENGTH || !normalizedSingleCountry.startsWith('07')) {
      return { input, normalized: null, isValid: false, reason: 'local_format_must_be_07xxxxxxxxx' };
    }

    const e164 = `+${IRAQ_COUNTRY_CODE}${normalizedSingleCountry.slice(1)}`;
    return { input, normalized: e164, isValid: true, reason: null };
  }

  if (normalizedSingleCountry.startsWith(IRAQ_COUNTRY_CODE)) {
    if (normalizedSingleCountry.length !== IRAQ_INTL_LENGTH) {
      return { input, normalized: null, isValid: false, reason: 'international_length_invalid' };
    }

    if (!normalizedSingleCountry.startsWith(`${IRAQ_COUNTRY_CODE}${IRAQ_MOBILE_PREFIX}`)) {
      return { input, normalized: null, isValid: false, reason: 'not_iraqi_mobile_prefix' };
    }

    return { input, normalized: `+${normalizedSingleCountry}`, isValid: true, reason: null };
  }

  return { input, normalized: null, isValid: false, reason: 'unsupported_country_or_format' };
}

export function selectBestBusinessPhone(fields: BusinessPhoneFields): SelectedPhoneResult {
  const priority: PhoneFieldName[] = ['whatsapp', 'phone', 'phone1', 'phone2', 'phone_1', 'phone_2'];
  const normalizationByField = priority.reduce((acc, fieldName) => {
    acc[fieldName] = normalizeIraqiPhone(fields[fieldName]);
    return acc;
  }, {} as Record<PhoneFieldName, NormalizedPhoneResult>);

  for (const fieldName of priority) {
    const result = normalizationByField[fieldName];
    if (result.isValid && result.normalized) {
      return {
        selectedPhone: result.normalized,
        phoneSource: fieldName,
        isValid: true,
        invalidReason: null,
        normalizationByField,
      };
    }
  }

  const firstFilled = priority
    .map((fieldName) => ({ fieldName, value: fields[fieldName], result: normalizationByField[fieldName] }))
    .find((entry) => Boolean(entry.value && entry.value.trim().length > 0));

  return {
    selectedPhone: null,
    phoneSource: firstFilled?.fieldName ?? null,
    isValid: false,
    invalidReason: firstFilled?.result.reason ?? DEFAULT_INVALID_REASON,
    normalizationByField,
  };
}
