// backend/utils/generateHTML.js
// ---------------------------------------------------------------
// Converts a resume data object + chosen template into a
// full HTML document string that Puppeteer renders to PDF.
//
// The visual style here intentionally mirrors the React templates
// in frontend/components/templates/* so the PDF matches the live
// preview closely.
// ---------------------------------------------------------------

const styles = {
  accent: '#334155',
  sidebarBg: '#1e293b',
  sidebarAcc: '#94a3b8',
};

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toExternalUrl(value = '') {
  if (!value) return '#';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function stripProtocol(value = '') {
  return String(value || '').replace(/^https?:\/\//i, '');
}

function getInitials(name = '') {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!words.length) return 'CP';
  return words.map((w) => w[0].toUpperCase()).join('');
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMonthYear(value) {
  const d = toDate(value);
  if (!d) return '';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateRange(from, to, fallback = '') {
  const f = formatMonthYear(from);
  const t = formatMonthYear(to);
  if (!f && !t) return fallback;
  if (f && t) return `${f} – ${t}`;
  if (f && !t) return `${f} – Present`;
  return t;
}

function sortByDateDesc(items = []) {
  const now = Date.now();
  const time = (v) => {
    const d = toDate(v);
    return d ? d.getTime() : null;
  };
  return [...items].sort((a, b) => {
    const aTo = time(a && a.to) !== null ? time(a.to) : (a && a.from ? now + 1 : 0);
    const bTo = time(b && b.to) !== null ? time(b.to) : (b && b.from ? now + 1 : 0);
    if (aTo !== bTo) return bTo - aTo;
    const aFrom = time(a && a.from) || 0;
    const bFrom = time(b && b.from) || 0;
    return bFrom - aFrom;
  });
}

function normalizeSkills(skills = []) {
  return (skills || [])
    .map((skill) => {
      if (typeof skill === 'string') {
        return { name: skill, description: '' };
      }

      return {
        name: String(skill?.name || ''),
        description: String(skill?.description || ''),
      };
    })
    .filter((skill) => skill.name || skill.description);
}

function sectionTag(title, accent) {
  return `<h2 style="color:${accent};border-bottom:1px solid ${accent}33">${esc(title)}</h2>`;
}

function multilineBody(text = '', className = 'body') {
  if (!text) return '';
  return `<p class="${className}">${esc(text).replace(/\r?\n/g, '<br />')}</p>`;
}

function markerHtml(index, style) {
  if (style === 'none') return '';
  const text = style === 'dot' ? '•' : `${index + 1}.`;
  return `<div class="list-marker">${text}</div>`;
}

function renderCustomSections(customSections, accent, marker) {
  return (customSections || []).map((s) => {
    const items = s?.items || [];
    const hasLegacy = !items.length && s?.content;
    if (!s?.title && !items.length && !hasLegacy) return '';
    const body = hasLegacy
      ? multilineBody(s.content)
      : items.map((item, ii) => `
          <div class="list-entry">
            ${markerHtml(ii, marker)}
            <div class="list-content">
              <div class="entry-left">${esc(item.name || '')}</div>
              ${item.description ? multilineBody(item.description) : ''}
            </div>
          </div>`).join('');
    return `
      <section>
        ${sectionTag(s.title || 'Custom Section', accent)}
        <div class="stack">${body}</div>
      </section>`;
  }).join('');
}

function classicTemplate(d, t) {
  const MAX_SKILLS   = 8;
  const MAX_PROJECTS = 5;

  const contact = [d.email, d.phone, d.location].filter(Boolean).map(esc).join('  |  ');
  const social  = [stripProtocol(d.linkedin), stripProtocol(d.github)].filter(Boolean).map(esc).join('  |  ');

  const photo = d.photo
    ? `<img class="photo photo-classic" src="${esc(d.photo)}" alt="${esc(d.name || 'Profile')}" />`
    : `<div class="photo photo-classic photo-placeholder">Photo</div>`;

  const skillsList = normalizeSkills(d.skills).slice(0, MAX_SKILLS);

  const renderEntryHeader = (left, sub, right) => `
    <div class="classic-entry-header">
      <div class="classic-entry-left">
        <span class="entry-title">${esc(left || '')}</span>
        ${sub ? ` <span class="entry-subtitle"> — ${esc(sub)}</span>` : ''}
      </div>
      ${right ? `<span class="entry-date">${esc(right)}</span>` : ''}
    </div>`;

  const education = sortByDateDesc(d.education || []).map((ed) => `
    <div class="classic-block">
      ${renderEntryHeader(ed.school, ed.degree, formatDateRange(ed.from, ed.to, ed.year || ''))}
    </div>`).join('');

  const experience = sortByDateDesc(d.experience || []).map((ex) => `
    <div class="classic-block">
      ${renderEntryHeader(ex.company, ex.role, formatDateRange(ex.from, ex.to, ex.duration || ''))}
      ${ex.description ? `<p class="classic-body">${esc(ex.description).replace(/\r?\n/g, '<br />')}</p>` : ''}
    </div>`).join('');

  const projects = sortByDateDesc(d.projects || []).slice(0, MAX_PROJECTS).map((pr) => `
    <div class="classic-block">
      <div class="classic-entry-header">
        <span class="entry-title">${esc(pr.title || '')}</span>
        ${pr.link ? `<a class="entry-date" href="${esc(toExternalUrl(pr.link))}">${esc(stripProtocol(pr.link))}</a>` : ''}
      </div>
      ${pr.description ? `<p class="classic-body">${esc(pr.description).replace(/\r?\n/g, '<br />')}</p>` : ''}
    </div>`).join('');

  const skills = skillsList.map((skill) => `
    <div class="skill-line">
      <span class="skill-cat">${esc(skill.name)}</span>
      ${skill.description ? `<span class="skill-val">: ${esc(skill.description)}</span>` : ''}
    </div>`).join('');

  const classicSectionTag = (title) =>
    `<h2 class="classic-h2">${esc(title)}</h2>`;

  const renderClassicCustomSections = () =>
    (d.customSections || []).map((s) => {
      const items = s?.items || [];
      const hasLegacy = !items.length && s?.content;
      if (!s?.title && !items.length && !hasLegacy) return '';
      const body = hasLegacy
        ? `<p class="classic-body">${esc(s.content).replace(/\r?\n/g, '<br />')}</p>`
        : items.map((item) => `
            <div class="skill-line">
              <span class="skill-cat">${esc(item.name || '')}</span>
              ${item.description ? `<span class="skill-val"> — ${esc(item.description)}</span>` : ''}
            </div>`).join('');
      return `
        <section class="classic-section">
          ${classicSectionTag(s.title || 'Custom Section')}
          ${body}
        </section>`;
    }).join('');

  return `
    <article class="classic">
      <header class="classic-header">
        <div class="header-main">
          <div class="classic-name">${esc(d.name || 'Your Name')}</div>
          ${contact ? `<div class="classic-contact">${contact}</div>` : ''}
          ${social  ? `<div class="classic-contact classic-social">${social}</div>` : ''}
        </div>
        ${photo}
      </header>

      ${d.summary ? `
        <section class="classic-section">
          ${classicSectionTag('Objective')}
          <p class="classic-body">${esc(d.summary).replace(/\r?\n/g, '<br />')}</p>
        </section>` : ''}

      ${education ? `
        <section class="classic-section">
          ${classicSectionTag('Education')}
          ${education}
        </section>` : ''}

      ${experience ? `
        <section class="classic-section">
          ${classicSectionTag('Work Experience')}
          ${experience}
        </section>` : ''}

      ${projects ? `
        <section class="classic-section">
          ${classicSectionTag('Projects')}
          ${projects}
        </section>` : ''}

      ${skills ? `
        <section class="classic-section">
          ${classicSectionTag(d.skillsTitle || 'Skills')}
          <div class="skills-classic">${skills}</div>
        </section>` : ''}

      ${renderClassicCustomSections()}
    </article>`;
}

function modernTemplate(d, t) {
  const photo = d.photo
    ? `<img class="photo photo-dark" src="${esc(d.photo)}" alt="${esc(d.name || 'Profile')}" />`
    : `<div class="photo photo-dark photo-initials">${esc(getInitials(d.name))}</div>`;
  const skillsList = normalizeSkills(d.skills);

  const info = (label, value, href) => {
    if (!value) return '';
    const body = href
      ? `<a class="info-link" href="${esc(href)}">${esc(value)}</a>`
      : `<div class="info-value">${esc(value)}</div>`;
    return `
      <div class="info-row">
        <div class="info-label">${esc(label)}</div>
        ${body}
      </div>`;
  };

  const markerM = d.markerStyle || 'number';
  const sidebarMarker = (index) => {
    if (markerM === 'none') return '';
    return `<div class="skill-marker">${markerM === 'dot' ? '•' : `${index + 1}.`}</div>`;
  };

  const skills = skillsList.map((skill, index) => `
    <div class="skill-item">
      ${sidebarMarker(index)}
      <div>
        <div class="skill-name">${esc(skill.name)}</div>
        ${skill.description ? multilineBody(skill.description, 'skill-desc') : ''}
      </div>
    </div>`).join('');

  const sidebar = `
    <aside style="background:${t.sidebarBg}">
      ${photo}
      <h1 class="sidebar-name">${esc(d.name || 'Your Name')}</h1>
      <hr class="sidebar-divider" />

      <div class="info-stack" style="color:${t.sidebarAcc}">
        ${info('Email', d.email)}
        ${info('Phone', d.phone)}
        ${info('Location', d.location)}
        ${info('LinkedIn', stripProtocol(d.linkedin), d.linkedin && toExternalUrl(d.linkedin))}
        ${info('GitHub', stripProtocol(d.github), d.github && toExternalUrl(d.github))}
      </div>

      ${skills ? `
        <div class="sidebar-section">
          <h2 class="sidebar-heading">${esc(d.skillsTitle || 'Skills')}</h2>
          <div class="skills-stack">${skills}</div>
        </div>` : ''}
    </aside>`;

  const renderEntryHeader = (left, sub, right) => `
    <div class="entry-header">
      <div>
        <div class="entry-left">${esc(left || '')}</div>
        ${sub ? `<div class="entry-sub" style="color:${t.accent}">${esc(sub)}</div>` : ''}
      </div>
      ${right ? `<div class="entry-right">${esc(right)}</div>` : ''}
    </div>`;

  const experience = sortByDateDesc(d.experience || []).map((ex) => `
    <div>
      ${renderEntryHeader(ex.company, ex.role, formatDateRange(ex.from, ex.to, ex.duration || ''))}
      ${multilineBody(ex.description)}
    </div>`).join('');

  const education = sortByDateDesc(d.education || []).map((ed) =>
    renderEntryHeader(ed.school, ed.degree, formatDateRange(ed.from, ed.to, ed.year || ''))
  ).join('');

  const projects = (d.projects || []).map((pr, index) => `
    <div class="list-entry">
      ${markerHtml(index, markerM)}
      <div class="list-content">
        <div class="entry-header">
          <div class="entry-left">${esc(pr.title || '')}</div>
          ${pr.link ? `<a class="link-muted" href="${esc(toExternalUrl(pr.link))}">${esc(stripProtocol(pr.link))}</a>` : ''}
        </div>
        ${multilineBody(pr.description)}
      </div>
    </div>`).join('');

  return `
    <article class="modern">
      ${sidebar}
      <main>
        ${d.summary ? `
          <section>
            ${sectionTag('About', t.accent)}
            ${multilineBody(d.summary)}
          </section>` : ''}

        <section>
          ${sectionTag('Experience', t.accent)}
          <div class="stack">${experience}</div>
        </section>

        <section>
          ${sectionTag('Education', t.accent)}
          <div class="stack">${education}</div>
        </section>

        <section>
          ${sectionTag('Projects', t.accent)}
          <div class="stack">${projects}</div>
        </section>

        ${renderCustomSections(d.customSections, t.accent, markerM)}
      </main>
    </article>`;
}

function generateHTML(resumeData = {}, templateName = 'classic') {
  const t = styles;
  const body = templateName === 'modern'
    ? modernTemplate(resumeData, t)
    : classicTemplate(resumeData, t);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(resumeData.name || 'Resume')}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Inter', Arial, Helvetica, sans-serif;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.62;
      background: #ffffff;
    }
    a { color: inherit; text-decoration: none; }
    h1 { margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.05; }
    h2 {
      margin: 0 0 14px 0;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      padding-bottom: 4px;
    }
    section { margin-top: 28px; }
    .stack { display: flex; flex-direction: column; gap: 16px; }
    .body {
      margin: 6px 0 0 0;
      color: #334155;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .muted { color: #64748b; }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    .entry-left { font-weight: 600; font-size: 13px; color: #0f172a; overflow-wrap: anywhere; }
    .entry-sub { font-size: 11.5px; font-weight: 500; margin-top: 2px; }
    .entry-right { font-size: 11px; color: #64748b; white-space: nowrap; }
    .link-muted { font-size: 11px; color: #64748b; }
    .list-entry {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .list-marker {
      min-width: 18px;
      padding-top: 2px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }
    .list-content {
      flex: 1;
      min-width: 0;
    }
    .classic {
      padding: 18mm 16mm 14mm 16mm;
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 11px;
      line-height: 1.55;
    }
    .classic-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 10px;
      border-bottom: 2.5px solid #1a1a1a;
      margin-bottom: 2px;
    }
    .header-main { flex: 1; min-width: 0; }
    .classic-name {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.1;
      color: #0f172a;
      text-transform: uppercase;
    }
    .classic-contact { margin-top: 5px; font-size: 10.5px; color: #334155; line-height: 1.6; }
    .classic-social  { margin-top: 2px; color: #475569; }
    .photo {
      flex-shrink: 0;
      object-fit: cover;
    }
    .photo-classic {
      width: 72px;
      height: 88px;
      border: 1px solid #cbd5e1;
    }
    .photo-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.3;
    }
    .classic-section { margin-top: 12px; }
    .classic-h2 {
      margin: 0 0 5px 0;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #1a1a1a;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 3px;
    }
    .classic-block { margin-bottom: 7px; }
    .classic-entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .classic-entry-left { flex: 1; min-width: 0; }
    .entry-title   { font-weight: 700; font-size: 11.5px; color: #0f172a; }
    .entry-subtitle { font-weight: 400; font-size: 11px; color: #334155; }
    .entry-date    { font-size: 10.5px; color: #64748b; white-space: nowrap; flex-shrink: 0; }
    .classic-body  {
      margin: 3px 0 0 0;
      font-size: 11px;
      color: #334155;
      text-align: justify;
      line-height: 1.55;
    }
    .skills-classic { display: flex; flex-direction: column; gap: 4px; }
    .skill-line { font-size: 11px; color: #1e293b; line-height: 1.5; }
    .skill-cat  { font-weight: 700; }
    .skill-val  { font-weight: 400; color: #334155; }
    .modern {
      display: grid;
      grid-template-columns: 30% minmax(0, 70%);
      min-height: 100vh;
    }
    .modern aside {
      padding: 32px 16px 32px 28px;
      color: #f1f5f9;
    }
    .photo-dark {
      border: 2px solid rgba(255,255,255,0.2);
    }
    .photo-initials {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.1);
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
    }
    .sidebar-name {
      margin-top: 20px;
      color: #ffffff;
      font-size: 28px;
      line-height: 1.15;
      font-weight: 700;
    }
    .sidebar-divider {
      margin-top: 12px;
      border: 0;
      border-top: 1px solid rgba(255,255,255,0.3);
    }
    .info-stack {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      font-size: 11px;
    }
    .info-row { line-height: 1.45; }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: rgba(255,255,255,0.6);
      margin-bottom: 3px;
    }
    .info-value,
    .info-link {
      color: #ffffff;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .sidebar-section { margin-top: 28px; }
    .sidebar-heading {
      color: rgba(255,255,255,0.9);
      border-bottom: 1px solid rgba(255,255,255,0.25);
    }
    .skills-stack {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .skill-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11px;
    }
    .skill-marker {
      padding-top: 2px;
      color: rgba(255,255,255,0.7);
    }
    .skill-name {
      color: #ffffff;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .skill-desc {
      margin: 2px 0 0 0;
      color: rgba(255,255,255,0.78);
      line-height: 1.55;
    }
    .modern main {
      min-width: 0;
      padding: 36px 32px 36px 20px;
      background: #ffffff;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .modern main section:first-child { margin-top: 0; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

module.exports = { generateHTML };
