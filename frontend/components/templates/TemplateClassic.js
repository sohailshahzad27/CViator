// frontend/components/templates/TemplateClassic.js
// ---------------------------------------------------------------
// Classic template — strictly minimal, black & white, print-ready.
// A subtle accent color highlights section headings.
//
// Mirrors backend/utils/generateHTML.js so the PDF looks identical.
// ---------------------------------------------------------------

import { memo } from 'react';
import { formatDateRange } from './dateRange';

const accent = '#334155';

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
    const aFrom = time(a?.from) ?? 0;
    const bFrom = time(b?.from) ?? 0;
    return bFrom - aFrom;
  });
}

function markerText(index, style) {
  if (style === 'none') return null;
  return style === 'dot' ? '•' : `${index + 1}.`;
}

function TemplateClassic({ resume }) {
  const r = resume || {};
  const skills     = normalizeSkills(r.skills);
  const experience = sortByDateDesc(r.experience || []);
  const education  = sortByDateDesc(r.education  || []);
  const marker     = r.markerStyle || 'number';

  return (
    <article className="bg-white p-10 text-[12px] leading-[1.62] text-slate-900">

      {/* Header — bolder bottom border to separate from body */}
      <header className="mb-8 flex items-start justify-between gap-8 border-b-2 border-slate-400 pb-7">
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">
            {r.name || 'Your Name'}
          </h1>
          <p className="mt-2 text-[12.5px] text-slate-600">
            {[r.email, r.phone, r.location].filter(Boolean).join(' • ')}
          </p>
          <p className="mt-1.5 text-[12.5px] text-slate-500">
            {[stripProtocol(r.linkedin), stripProtocol(r.github)].filter(Boolean).join(' • ')}
          </p>
        </div>
        {r.photo && (
          <img
            src={r.photo}
            alt={r.name || 'Profile photo'}
            className="h-28 w-28 flex-shrink-0 rounded-full border border-slate-200 object-cover"
          />
        )}
      </header>

      {r.summary && (
        <Section title="Summary" accent={accent}>
          <MultilineText>{r.summary}</MultilineText>
        </Section>
      )}

      <Section title="Experience" accent={accent}>
        {experience.map((ex, i) => (
          <Entry key={ex.id || `exp-${i}`}>
            <EntryHeader
              left={ex.company}
              sub={ex.role}
              right={formatDateRange(ex.from, ex.to, { fallback: ex.duration || '' })}
              accent={accent}
            />
            {ex.description && (
              <MultilineText className="mt-1.5">{ex.description}</MultilineText>
            )}
          </Entry>
        ))}
      </Section>

      <Section title="Education" accent={accent}>
        {education.map((ed, i) => (
          <Entry key={ed.id || `edu-${i}`}>
            <EntryHeader
              left={ed.school}
              sub={ed.degree}
              right={formatDateRange(ed.from, ed.to, { fallback: ed.year || '' })}
              accent={accent}
            />
          </Entry>
        ))}
      </Section>

      <Section title="Projects" accent={accent}>
        <div className="space-y-4">
          {(r.projects || []).map((pr, i) => (
            <Entry key={`proj-${i}`}>
              <div className="flex items-start gap-3">
                {markerText(i, marker) && (
                  <div className="min-w-[1.25rem] shrink-0 pt-0.5 text-xs font-semibold text-slate-500">
                    {markerText(i, marker)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-semibold text-slate-900">{pr.title}</div>
                    {pr.link && (
                      <a href={toExternalUrl(pr.link)} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-slate-900">
                        {stripProtocol(pr.link)}
                      </a>
                    )}
                  </div>
                  {pr.description && <MultilineText className="mt-1.5">{pr.description}</MultilineText>}
                </div>
              </div>
            </Entry>
          ))}
        </div>
      </Section>

      {skills.length > 0 && (
        <Section title={r.skillsTitle || 'Skills'} accent={accent}>
          <div className="space-y-3">
            {skills.map((skill, i) => (
              <div key={`skill-${i}`} className="flex items-start gap-3">
                {markerText(i, marker) && (
                  <div className="min-w-[1rem] shrink-0 pt-0.5 text-xs text-slate-500">
                    {markerText(i, marker)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">{skill.name}</div>
                  {skill.description && <MultilineText className="mt-0.5">{skill.description}</MultilineText>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(r.customSections || []).map((sec, si) => {
        const items = sec?.items || [];
        // Backward compat: old format used a plain `content` string
        const hasLegacyContent = !items.length && sec?.content;
        if (!sec?.title && !items.length && !hasLegacyContent) return null;
        return (
          <Section key={sec.id || `custom-${si}`} title={sec.title || 'Custom Section'} accent={accent}>
            {hasLegacyContent ? (
              <MultilineText>{sec.content}</MultilineText>
            ) : (
              <div className="space-y-3">
                {items.map((item, ii) => (
                  <div key={item.id || `ci-${ii}`} className="flex items-start gap-3">
                    {markerText(ii, marker) && (
                      <div className="min-w-[1rem] shrink-0 pt-0.5 text-xs text-slate-500">
                        {markerText(ii, marker)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      {item.description && <MultilineText className="mt-0.5">{item.description}</MultilineText>}
                    </div>
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

// ── sub-components ────────────────────────────────────────────

function Section({ title, accent, children }) {
  return (
    <section className="mt-7">
      <h2
        className="mb-3.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: accent, borderBottom: `1px solid ${accent}33` }}
      >
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Entry({ children }) {
  return <div>{children}</div>;
}

function EntryHeader({ left, sub, right, accent }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <div className="text-[13px] font-semibold text-slate-900">{left}</div>
        {sub && (
          <div className="mt-0.5 text-[11.5px] font-medium" style={{ color: accent }}>
            {sub}
          </div>
        )}
      </div>
      {right && <div className="text-xs text-slate-500">{right}</div>}
    </div>
  );
}

function MultilineText({ children, className = '' }) {
  return (
    <p className={`whitespace-pre-line break-words text-slate-700 ${className}`.trim()}>
      {children}
    </p>
  );
}

function toExternalUrl(value = '') {
  if (!value) return '#';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function stripProtocol(value = '') {
  return (value || '').replace(/^https?:\/\//i, '');
}

function normalizeSkills(skills = []) {
  return (skills || [])
    .map((skill) => (
      typeof skill === 'string'
        ? { name: skill, description: '' }
        : { name: skill?.name || '', description: skill?.description || '' }
    ))
    .filter((s) => s.name || s.description);
}
