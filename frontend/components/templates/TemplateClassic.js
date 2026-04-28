// frontend/components/templates/TemplateClassic.js
// ---------------------------------------------------------------
// Classic CV template — one-page A4, left-aligned header, justified
// body text. Mirrors the reference PDF layout exactly.
//
// Display limits (render layer only — full data stays in DB):
//   • Skills:   max 8  (rendered as "Category: skill1, skill2")
//   • Projects: max 5  (most-recent)
//
// Section order: Summary → Education → Experience → Projects →
//   Skills → custom sections
// ---------------------------------------------------------------

import { memo } from 'react';
import { formatDateRange } from './dateRange';

const ACCENT = '#1a1a1a';
const MAX_SKILLS   = 8;
const MAX_PROJECTS = 5;

// ── helpers ──────────────────────────────────────────────────────

function sortByDateDesc(items = []) {
  const now = Date.now();
  const time = (v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    const t = d.getTime();
    return Number.isFinite(t) ? t : null;
  };
  return [...items].sort((a, b) => {
    const aTo = time(a?.to) ?? (a?.from ? now + 1 : 0);
    const bTo = time(b?.to) ?? (b?.from ? now + 1 : 0);
    if (aTo !== bTo) return bTo - aTo;
    return (time(b?.from) ?? 0) - (time(a?.from) ?? 0);
  });
}

function normalizeSkills(skills = []) {
  return (skills || [])
    .map((s) =>
      typeof s === 'string'
        ? { name: s, description: '' }
        : { name: s?.name || '', description: s?.description || '' }
    )
    .filter((s) => s.name);
}

function stripProtocol(v = '') {
  return (v || '').replace(/^https?:\/\//i, '');
}

function toExternalUrl(v = '') {
  if (!v) return '#';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

// ── sub-components ────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section style={{ marginTop: '12px' }}>
      <h2
        style={{
          margin: '0 0 5px 0',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: ACCENT,
          borderBottom: `2px solid ${ACCENT}`,
          paddingBottom: '3px',
        }}
      >
        {title}
      </h2>
      <div style={{ marginTop: '6px' }}>{children}</div>
    </section>
  );
}

function EntryBlock({ title, subtitle, dateRange, description }) {
  return (
    <div style={{ marginBottom: '7px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: '11.5px', color: '#0f172a' }}>{title}</span>
          {subtitle && (
            <span style={{ fontWeight: 400, fontSize: '11px', color: '#334155' }}>
              {' — '}{subtitle}
            </span>
          )}
        </div>
        {dateRange && (
          <span style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {dateRange}
          </span>
        )}
      </div>
      {description && (
        <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#334155', textAlign: 'justify', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
          {description}
        </p>
      )}
    </div>
  );
}

// ── main template ─────────────────────────────────────────────────

function TemplateClassic({ resume }) {
  const r         = resume || {};
  const skills    = normalizeSkills(r.skills).slice(0, MAX_SKILLS);
  const projects  = sortByDateDesc(r.projects || []).slice(0, MAX_PROJECTS);
  const education = sortByDateDesc(r.education || []);
  const experience = sortByDateDesc(r.experience || []);

  return (
    <article
      style={{
        background: '#ffffff',
        width: '210mm',
        minHeight: '297mm',
        maxWidth: '100%',
        margin: '0 auto',
        padding: '18mm 16mm 14mm 16mm',
        fontFamily: "'Times New Roman', Times, Georgia, serif",
        fontSize: '11px',
        lineHeight: 1.55,
        color: '#0f172a',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '10px',
          borderBottom: '2.5px solid #1a1a1a',
          marginBottom: '2px',
        }}
      >
        {/* Left: all contact info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
              color: '#0f172a',
              textTransform: 'uppercase',
            }}
          >
            {r.name || 'Your Name'}
          </div>
          <div style={{ marginTop: '5px', fontSize: '10.5px', color: '#334155', lineHeight: 1.6 }}>
            {[r.email, r.phone, r.location].filter(Boolean).join('  |  ')}
          </div>
          {(r.linkedin || r.github) && (
            <div style={{ marginTop: '2px', fontSize: '10.5px', color: '#475569' }}>
              {[stripProtocol(r.linkedin), stripProtocol(r.github)].filter(Boolean).join('  |  ')}
            </div>
          )}
        </div>

        {/* Right: photo or placeholder */}
        <div style={{ flexShrink: 0 }}>
          {r.photo ? (
            <img
              src={r.photo}
              alt={r.name || 'Profile'}
              style={{
                width: '72px',
                height: '88px',
                objectFit: 'cover',
                border: '1px solid #cbd5e1',
              }}
            />
          ) : (
            <div
              style={{
                width: '72px',
                height: '88px',
                background: '#e2e8f0',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                color: '#94a3b8',
                textAlign: 'center',
                lineHeight: 1.3,
              }}
            >
              Photo
            </div>
          )}
        </div>
      </header>

      {/* ── Objective / Summary ── */}
      {r.summary && (
        <Section title="Objective">
          <p style={{ margin: 0, fontSize: '11px', color: '#1e293b', textAlign: 'justify', lineHeight: 1.55 }}>
            {r.summary}
          </p>
        </Section>
      )}

      {/* ── Education ── */}
      {education.length > 0 && (
        <Section title="Education">
          {education.map((ed, i) => (
            <EntryBlock
              key={ed.id || `edu-${i}`}
              title={ed.school}
              subtitle={ed.degree}
              dateRange={formatDateRange(ed.from, ed.to, { fallback: ed.year || '' })}
            />
          ))}
        </Section>
      )}

      {/* ── Work Experience ── */}
      {experience.length > 0 && (
        <Section title="Work Experience">
          {experience.map((ex, i) => (
            <EntryBlock
              key={ex.id || `exp-${i}`}
              title={ex.company}
              subtitle={ex.role}
              dateRange={formatDateRange(ex.from, ex.to, { fallback: ex.duration || '' })}
              description={ex.description}
            />
          ))}
        </Section>
      )}

      {/* ── Projects ── */}
      {projects.length > 0 && (
        <Section title="Projects">
          {projects.map((pr, i) => (
            <div key={pr.id || `proj-${i}`} style={{ marginBottom: '7px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '11.5px', color: '#0f172a' }}>
                  {pr.title}
                </span>
                {pr.link && (
                  <a
                    href={toExternalUrl(pr.link)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '10px', color: '#64748b', flexShrink: 0 }}
                  >
                    {stripProtocol(pr.link)}
                  </a>
                )}
              </div>
              {pr.description && (
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#334155', textAlign: 'justify', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                  {pr.description}
                </p>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* ── Skills ── */}
      {skills.length > 0 && (
        <Section title={r.skillsTitle || 'Skills'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {skills.map((skill, i) => (
              <div key={`skill-${i}`} style={{ fontSize: '11px', color: '#1e293b', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700 }}>{skill.name}</span>
                {skill.description && (
                  <span style={{ fontWeight: 400, color: '#334155' }}>
                    {': '}{skill.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Custom Sections (Achievements, etc.) ── */}
      {(r.customSections || []).map((sec, si) => {
        const items = sec?.items || [];
        const hasLegacy = !items.length && sec?.content;
        if (!sec?.title && !items.length && !hasLegacy) return null;
        return (
          <Section key={sec.id || `custom-${si}`} title={sec.title || 'Custom Section'}>
            {hasLegacy ? (
              <p style={{ margin: 0, fontSize: '11px', color: '#334155', textAlign: 'justify', lineHeight: 1.55 }}>
                {sec.content}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.map((item, ii) => (
                  <div key={item.id || `ci-${ii}`} style={{ fontSize: '11px', color: '#1e293b', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700 }}>{item.name}</span>
                    {item.description && (
                      <span style={{ color: '#334155' }}>{' — '}{item.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        );
      })}
    </article>
  );
}

export default memo(TemplateClassic);
