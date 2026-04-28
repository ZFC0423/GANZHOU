import {
  ALLOWED_CLEAR_FIELDS,
  OPTION_KEY_PATTERN,
  WARNING_CODES,
  createWarning
} from './contracts.js';

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function uniqStrings(value) {
  const source = Array.isArray(value) ? value : [];
  return Array.from(new Set(source.map((item) => normalizeText(item)).filter(Boolean)));
}

export function normalizeClearFields(value, warnings) {
  const source = Array.isArray(value) ? value : [];
  const allowed = new Set(ALLOWED_CLEAR_FIELDS);
  const seen = new Set();
  const normalized = [];

  source.forEach((item) => {
    const field = normalizeText(item);

    if (!allowed.has(field)) {
      if (field) {
        warnings.push(createWarning({
          code: WARNING_CODES.INVALID_CLEAR_FIELD,
          field
        }));
      }
      return;
    }

    if (!seen.has(field)) {
      seen.add(field);
      normalized.push(field);
    }
  });

  return normalized.filter((field) => {
    if (!field.includes('.')) {
      return true;
    }

    return !seen.has(field.split('.')[0]);
  });
}

export function normalizeOptionKeys(value, field, warnings) {
  const source = Array.isArray(value) ? value : [];
  const result = [];
  const seen = new Set();

  source.forEach((item) => {
    const optionKey = normalizeText(item);

    if (!OPTION_KEY_PATTERN.test(optionKey)) {
      if (optionKey) {
        warnings.push(createWarning({
          code: WARNING_CODES.INVALID_OPTION_KEY,
          field,
          option_key: optionKey
        }));
      }
      return;
    }

    if (!seen.has(optionKey)) {
      seen.add(optionKey);
      result.push(optionKey);
    }
  });

  return result;
}

export function hasSubstantiveValue(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => normalizeText(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((item) => hasSubstantiveValue(item));
  }

  return normalizeText(value) !== '';
}
