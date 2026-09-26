// frontend/utils/resume.js
// Shared pure utility functions used by templates, the form, and pages.
// Nothing React-specific here — all plain JS.

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function withId(item) {
  return item?.id ? item : { ...item, id: uid() };
}

function toTime(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

export function sortByDateDesc(items = []) {
  const now = Date.now();
  return [...items].sort((a, b) => {
    const aTo = toTime(a?.to) ?? (a?.from ? now + 1 : 0);
    const bTo = toTime(b?.to) ?? (b?.from ? now + 1 : 0);
    if (aTo !== bTo) return bTo - aTo;
    return (toTime(b?.from) ?? 0) - (toTime(a?.from) ?? 0);
  });
}

export function normalizeSkills(skills = []) {
  return (skills || [])
    .map((s) =>
      typeof s === 'string'
        ? { name: s, description: '' }
        : { name: s?.name || '', description: s?.description || '' }
    )
    .filter((s) => s.name || s.description);
}

export function toExternalUrl(v = '') {
  if (!v) return '#';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function stripProtocol(v = '') {
  return (v || '').replace(/^https?:\/\//i, '');
}

export function getInitials(name = '') {
  const words = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!words.length) return 'CP';
  return words.map((w) => w[0].toUpperCase()).join('');
}

const hasText = (v) => !!v && String(v).trim().length > 0;

/**
 * True when a resume carries no meaningful content yet. Drives the demo
 * preview and the section-completeness indicator, and is shared by both
 * templates so they agree on what "empty" means.
 */
export function isEffectivelyEmpty(r) {
  if (!r) return true;
  if (
    hasText(r.name) || hasText(r.email) || hasText(r.phone) || hasText(r.location) ||
    hasText(r.linkedin) || hasText(r.github) || hasText(r.others) ||
    hasText(r.summary) || hasText(r.photo)
  ) return false;
  if ((r.education  || []).some((e) => hasText(e?.school)  || hasText(e?.degree))) return false;
  if ((r.experience || []).some((e) => hasText(e?.company) || hasText(e?.role)))   return false;
  if ((r.projects   || []).some((p) => hasText(p?.title)   || hasText(p?.description))) return false;
  if ((r.skills     || []).some((s) => hasText(typeof s === 'string' ? s : s?.name))) return false;
  if ((r.customSections || []).some((sec) =>
    hasText(sec?.title) || hasText(sec?.content) ||
    (sec?.items || []).some((i) => hasText(i?.name) || hasText(i?.description))
  )) return false;
  return true;
}

/**
 * Per-section completion, used by the builder's section navigator.
 * Returns [{ key, label, done }] in the order the CV renders them.
 */
export function sectionStatus(r = {}) {
  const list = (v) => (Array.isArray(v) ? v : []);
  return [
    { key: 'personal',   label: 'Personal details', done: hasText(r.name) && hasText(r.email) },
    { key: 'links',      label: 'Social links',     done: hasText(r.linkedin) || hasText(r.github) || hasText(r.others) },
    { key: 'summary',    label: 'Objective',        done: hasText(r.summary) },
    { key: 'experience', label: 'Experience',       done: list(r.experience).some((e) => hasText(e?.company) || hasText(e?.role)) },
    { key: 'education',  label: 'Education',        done: list(r.education).some((e) => hasText(e?.school)) },
    { key: 'projects',   label: 'Projects',         done: list(r.projects).some((p) => hasText(p?.title)) },
    { key: 'skills',     label: 'Skills',           done: list(r.skills).some((s) => hasText(typeof s === 'string' ? s : s?.name)) },
    { key: 'custom',     label: 'Custom sections',  done: list(r.customSections).some((s) => hasText(s?.title)) },
  ];
}
