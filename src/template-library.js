import { BUILTIN_TEMPLATES, TEMPLATE_STORAGE_KEY, sanitizeTemplate } from './templates.js';

// Keep the original storage key so installations made before v0.4 can migrate without
// losing existing templates. New writes use a versioned envelope and a recovery slot.
export const TEMPLATE_BACKUP_KEY = TEMPLATE_STORAGE_KEY + ':previous-good';
export const TEMPLATE_LIBRARY_VERSION = 2;
export const TEMPLATE_LIBRARY_KIND = 'excel-label-studio-template-library';
const MAX_TEMPLATES = 50;
const builtInIds = new Set(BUILTIN_TEMPLATES.map((item) => item.id));

function decode(raw) {
  if (raw === null || raw === undefined) return null;
  const value = JSON.parse(raw);
  const data = Array.isArray(value) ? value : (
    value && value.version === TEMPLATE_LIBRARY_VERSION &&
    value.kind === TEMPLATE_LIBRARY_KIND ? value.templates : null);
  if (!Array.isArray(data) || data.length > MAX_TEMPLATES) {
    throw new Error('Unsupported or oversized saved template library.');
  }
  const seen = new Set();
  const templates = data.map((candidate) => {
    if (!candidate || !Array.isArray(candidate.fields)) {
      throw new Error('Saved library contains an invalid template.');
    }
    const normalized = sanitizeTemplate(candidate);
    if (!normalized || !normalized.id || builtInIds.has(normalized.id) || seen.has(normalized.id)) {
      throw new Error('Saved library contains invalid or duplicate template IDs.');
    }
    seen.add(normalized.id);
    return normalized;
  });
  return templates;
}

export function readTemplateLibrary(storage) {
  try {
    const rawPrimary = storage.getItem(TEMPLATE_STORAGE_KEY);
    const rawBackup = storage.getItem(TEMPLATE_BACKUP_KEY);
    if (rawPrimary === null && rawBackup === null) {
      return { templates: [], warning: '', blocked: false, recovered: false };
    }
    if (rawPrimary !== null) {
      try {
        return { templates: decode(rawPrimary), warning: '', blocked: false, recovered: false };
      } catch {
        // Try the last valid template library rather than losing it.
      }
    }
    if (rawBackup !== null) {
      try {
        return {
          templates: decode(rawBackup),
          warning: 'The current template library was damaged. A previous saved copy was recovered. Export a backup before making further changes.',
          blocked: false,
          recovered: true
        };
      } catch {
        // Protect invalid data against an automatic overwrite.
      }
    }
    return {
      templates: [],
      warning: 'Saved template data cannot be read. Existing storage is preserved; saving is disabled until it is recovered.',
      blocked: true,
      recovered: false
    };
  } catch (error) {
    return {
      templates: [],
      warning: 'Template storage is unavailable: ' + (error?.message || 'Unknown error') + '. Saving is disabled.',
      blocked: true,
      recovered: false
    };
  }
}

export function writeTemplateLibrary(storage, templates) {
  const normalized = decode(JSON.stringify(templates));
  const state = readTemplateLibrary(storage);
  if (state.blocked) throw new Error('Cannot save: existing template data is unreadable or local storage is unavailable.');
  const original = storage.getItem(TEMPLATE_STORAGE_KEY);
  // Ensure there is always a known-good backup before overwriting a good primary.
  if (original !== null && !state.recovered) {
    storage.setItem(TEMPLATE_BACKUP_KEY, original);
  }
  const envelope = {
    kind: TEMPLATE_LIBRARY_KIND,
    version: TEMPLATE_LIBRARY_VERSION,
    savedAt: new Date().toISOString(),
    templates: normalized
  };
  storage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(envelope));
  return normalized;
}

export function validateLibraryImport(value) {
  if (Array.isArray(value)) return decode(JSON.stringify(value));
  if (value?.kind !== TEMPLATE_LIBRARY_KIND || value?.version !== TEMPLATE_LIBRARY_VERSION) {
    throw new Error('Unsupported template backup format.');
  }
  return decode(JSON.stringify(value));
}

export function exportTemplateLibrary(templates) {
  const normalized = decode(JSON.stringify(templates));
  return {
    kind: TEMPLATE_LIBRARY_KIND,
    version: TEMPLATE_LIBRARY_VERSION,
    exportedAt: new Date().toISOString(),
    templates: normalized
  };
}
