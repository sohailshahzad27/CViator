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

function classicTemplate(d) {
  // Render-only caps; full data stays in DB.
  const MAX_SKILLS     = 8;
  const MAX_PROJECTS   = 4;
  const MAX_SUMMARY    = 420;
  const MAX_DESC       = 280;
  const MAX_AW_DESC    = 180;
  const MAX_SKILL_DESC = 160;

  const trim = (text, n) => {
    if (!text) return '';
    const s = String(text).trim();
    return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
  };

  const toLines = (text) =>
    String(text || '')
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*[-•*]\s?/, '').trim())
      .filter(Boolean);

  const skillsList = normalizeSkills(d.skills).slice(0, MAX_SKILLS);
  const projects   = sortByDateDesc(d.projects || []).slice(0, MAX_PROJECTS);
  const finalYear  = projects[0];
  const academic   = projects.slice(1);

  const customs   = d.customSections || [];
  const isAwards  = (s) => /award|achievement|honor/i.test(s?.title || '');
  const awards    = customs.filter(isAwards);
  const otherCustom = customs.filter((s) => !isAwards(s));

  const addressLines = String(d.location || '')
    .split(/\r?\n|,\s*/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4);

  const photo = d.photo
    ? `<img class="cls-photo" src="${esc(d.photo)}" alt="${esc(d.name || 'Profile')}" />`
    : `<div class="cls-photo cls-photo-placeholder">Profile<br />Photo</div>`;

  const entry = (title, locLine, dateLine, lines = []) => `
    <div class="cls-entry">
      <div class="cls-entry-head">
        <span class="cls-entry-title">${esc(title || '')}</span>
        ${(locLine || dateLine) ? `
          <div class="cls-entry-meta">
            ${locLine  ? `<div>${esc(locLine)}</div>`  : ''}
            ${dateLine ? `<div>${esc(dateLine)}</div>` : ''}
          </div>` : ''}
      </div>
      ${lines.map((l) => `<div class="cls-sub">${esc(l)}</div>`).join('')}
    </div>`;

  const renderProject = (pr) => {
    const lines = toLines(pr.description).map((l) => trim(l, MAX_DESC));
    const dateRange = formatDateRange(pr.from, pr.to);
    return `
      <div class="cls-entry">
        <div class="cls-entry-head">
          <span class="cls-entry-title">${esc(pr.title || '')}</span>
          ${dateRange ? `<div class="cls-entry-meta"><div>${esc(dateRange)}</div></div>` : ''}
        </div>
        ${lines.length > 1
          ? `<ul class="cls-bullets">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
          : lines.length === 1 ? `<p class="cls-body">${esc(lines[0])}</p>` : ''}
        ${pr.link ? `<a class="cls-link" href="${esc(toExternalUrl(pr.link))}">${esc(stripProtocol(pr.link))}</a>` : ''}
      </div>`;
  };

  const educationHtml = sortByDateDesc(d.education || []).map((ed) =>
    entry(
      ed.school,
      ed.location || '',
      formatDateRange(ed.from, ed.to, ed.year || ''),
      [ed.degree, ed.description].filter(Boolean).map((s) => trim(s, MAX_DESC))
    )
  ).join('');

  const experienceHtml = sortByDateDesc(d.experience || []).map((ex) =>
    entry(
      [ex.company, ex.role].filter(Boolean).join(', '),
      ex.location || '',
      formatDateRange(ex.from, ex.to, ex.duration || ''),
      ex.description ? [trim(ex.description, MAX_DESC)] : []
    )
  ).join('');

  const skillsHtml = skillsList.map((s) => `
    <li>
      ${s.name ? `<strong>${esc(s.name)}</strong>` : ''}
      ${s.name && s.description ? ': ' : ''}
      ${s.description ? esc(trim(s.description, MAX_SKILL_DESC)) : ''}
    </li>`).join('');

  const renderAwardOrCustom = (sec, fallbackTitle) => {
    const items = sec?.items || [];
    const legacy = !items.length && sec?.content ? toLines(sec.content) : [];
    if (!items.length && !legacy.length) return '';
    const body = items.length
      ? items.map((it) => `
          <li>
            ${it.name ? `<strong>${esc(it.name)}</strong>` : ''}
            ${it.name && it.description ? ' — ' : ''}
            ${it.description ? esc(trim(it.description, MAX_AW_DESC)) : ''}
          </li>`).join('')
      : legacy.map((l) => `<li>${esc(trim(l, MAX_AW_DESC))}</li>`).join('');
    return row(fallbackTitle || sec.title || 'Custom', `<ul class="cls-bullets">${body}</ul>`);
  };

  const row = (label, content) => `
    <div class="cls-row">
      <div class="cls-label">${label}</div>
      <div class="cls-content">${content}</div>
    </div>`;

  return `
    <article class="cls">
      <header class="cls-header">
        <div class="cls-header-left">
          <div class="cls-name">${esc(d.name || 'Your Name')}</div>
          <div class="cls-contact">
            ${d.email ? `<div>${esc(d.email)}</div>` : ''}
            ${d.phone ? `<div>${esc(d.phone)}</div>` : ''}
            ${(d.linkedin || d.github) ? `<div>${
              [stripProtocol(d.linkedin), stripProtocol(d.github)].filter(Boolean).map(esc).join('  |  ')
            }</div>` : ''}
            ${addressLines.length ? `
              <div class="cls-address">
                <div><strong>Address</strong></div>
                ${addressLines.map((l) => `<div>${esc(l)}</div>`).join('')}
              </div>` : ''}
          </div>
        </div>
        ${photo}
      </header>

      ${d.summary ? row('Objective', `<p class="cls-body">${esc(trim(d.summary, MAX_SUMMARY))}</p>`) : ''}
      ${educationHtml  ? row('Education', educationHtml) : ''}
      ${experienceHtml ? row('Work<br/>Experience', experienceHtml) : ''}
      ${finalYear      ? row('Final Year<br/>Project', renderProject(finalYear)) : ''}
      ${academic.length ? row('Academic<br/>Projects', academic.map(renderProject).join('')) : ''}
      ${awards.map((s) => renderAwardOrCustom(s, 'Awards &amp;<br/>Achievements')).join('')}
      ${skillsHtml ? row(esc(d.skillsTitle || 'Skills'), `<ul class="cls-bullets">${skillsHtml}</ul>`) : ''}
      ${otherCustom.map((s) => renderAwardOrCustom(s)).join('')}
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
    : classicTemplate(resumeData);

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
    /* ── Classic (institute) template ──────────────────────── */
    .cls {
      width: 210mm;
      height: 297mm;
      padding: 14mm 16mm;
      font-family: 'Times New Roman', Times, serif;
      font-size: 10.5px;
      line-height: 1.35;
      color: #000;
      box-sizing: border-box;
      overflow: hidden;
    }
    .cls-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #000;
    }
    .cls-header-left { flex: 1; min-width: 0; }
    .cls-name {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.1;
      color: #000;
    }
    .cls-contact   { margin-top: 6px; font-size: 10.5px; line-height: 1.4; }
    .cls-address   { margin-top: 4px; }
    .cls-photo {
      flex-shrink: 0;
      width: 100px;
      height: 120px;
      object-fit: cover;
      border: 1px solid #000;
      display: block;
    }
    .cls-photo-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #666;
      font-style: italic;
      text-align: center;
      line-height: 1.3;
      background: #fafafa;
    }
    .cls-row {
      display: grid;
      grid-template-columns: 110px 1fr;
      column-gap: 14px;
      padding-top: 8px;
    }
    .cls-label {
      text-align: right;
      font-weight: 700;
      font-size: 11px;
      color: #000;
      padding-right: 12px;
      border-right: 1px solid #000;
      line-height: 1.25;
    }
    .cls-content { font-size: 10.5px; color: #000; line-height: 1.4; }
    .cls-entry { margin-bottom: 6px; }
    .cls-entry:last-child { margin-bottom: 0; }
    .cls-entry-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .cls-entry-title { font-weight: 700; font-size: 11px; color: #000; }
    .cls-entry-meta  { text-align: right; font-size: 10px; line-height: 1.3; flex-shrink: 0; }
    .cls-sub  { margin-top: 1px; font-size: 10.5px; }
    .cls-body { margin: 2px 0 0 0; font-size: 10.5px; line-height: 1.4; }
    .cls-bullets { margin: 2px 0 0 0; padding-left: 14px; }
    .cls-bullets li { font-size: 10.5px; line-height: 1.4; margin-bottom: 1px; }
    .cls-link { font-size: 10px; color: #000; }
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
