// frontend/components/ResumeForm.js
// The CV editor.
//
// Structure mirrors the printed document's section order, and each section
// carries an `id` (section-<key>) so the builder's section rail can jump to
// it. Repeating rows are memoised and keyed by stable id, so typing in one
// entry doesn't re-render the others.
//
// Input caps match the render-side trim() values in TemplateClassic.js and
// backend/utils/generateHTML.js — what you type is what prints.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { uid, withId, sortByDateDesc } from '../utils/resume';
import { cn } from '../utils/cn';
import {
  Button,
  FieldLabel,
  Modal,
  Segmented,
  SelectField,
  TextArea,
  TextField,
} from './ui';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const CROP_SIZE = 240;

const MARKER_OPTIONS = [
  { value: 'number', label: '1. 2.' },
  { value: 'dot', label: '• Dots' },
  { value: 'none', label: 'None' },
];

const LIMITS = {
  name: 80,
  email: 120,
  phone: 30,
  location: 160,
  socialLink: 120,
  summary: 420,
  company: 80,
  role: 80,
  school: 120,
  degree: 120,
  projectTitle: 80,
  projectLink: 160,
  description: 280,
  skillName: 60,
  skillDesc: 160,
  customTitle: 60,
  customName: 80,
  customDesc: 180,
};

// normalizeSkills() in utils strips ids, so re-attach them here for keys.
function ensureSkillIds(skills = []) {
  return (skills || []).map((s) =>
    typeof s === 'string'
      ? { id: uid(), name: s, description: '' }
      : { id: s.id || uid(), name: s.name || '', description: s.description || '' }
  );
}

function ResumeForm({ resume, setResume }) {
  const [uploadError, setUploadError] = useState('');
  const [cropSrc, setCropSrc] = useState(null);

  // ── Generic updaters (stable, so memoised rows stay memoised) ──
  const updateField = useCallback(
    (key, value) => setResume((prev) => ({ ...prev, [key]: value })),
    [setResume]
  );

  const updateItem = useCallback(
    (key, id, field, value) =>
      setResume((prev) => ({
        ...prev,
        [key]: (prev[key] || []).map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      })),
    [setResume]
  );

  const addItem = useCallback(
    (key, blank) =>
      setResume((prev) => ({ ...prev, [key]: [...(prev[key] || []), withId(blank)] })),
    [setResume]
  );

  const removeItem = useCallback(
    (key, id) =>
      setResume((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((item) => item.id !== id),
      })),
    [setResume]
  );

  // Per-collection bindings — stable identities for memoised children.
  const updateExperience = useCallback((id, f, v) => updateItem('experience', id, f, v), [updateItem]);
  const removeExperience = useCallback((id) => removeItem('experience', id), [removeItem]);
  const updateEducation = useCallback((id, f, v) => updateItem('education', id, f, v), [updateItem]);
  const removeEducation = useCallback((id) => removeItem('education', id), [removeItem]);
  const updateProject = useCallback((id, f, v) => updateItem('projects', id, f, v), [updateItem]);
  const removeProject = useCallback((id) => removeItem('projects', id), [removeItem]);

  // ── Skills ─────────────────────────────────────────────────────
  const addSkill = useCallback(
    () =>
      setResume((prev) => ({
        ...prev,
        skills: [...ensureSkillIds(prev.skills), { id: uid(), name: '', description: '' }],
      })),
    [setResume]
  );
  const updateSkill = useCallback(
    (id, field, value) =>
      setResume((prev) => ({
        ...prev,
        skills: ensureSkillIds(prev.skills).map((s) =>
          s.id === id ? { ...s, [field]: value } : s
        ),
      })),
    [setResume]
  );
  const removeSkill = useCallback(
    (id) =>
      setResume((prev) => ({
        ...prev,
        skills: ensureSkillIds(prev.skills).filter((s) => s.id !== id),
      })),
    [setResume]
  );

  // ── Custom sections ────────────────────────────────────────────
  const addCustomItem = useCallback(
    (sectionId) =>
      setResume((prev) => ({
        ...prev,
        customSections: (prev.customSections || []).map((sec) =>
          sec.id === sectionId
            ? { ...sec, items: [...(sec.items || []), { id: uid(), name: '', description: '' }] }
            : sec
        ),
      })),
    [setResume]
  );
  const updateCustomItem = useCallback(
    (sectionId, itemId, field, value) =>
      setResume((prev) => ({
        ...prev,
        customSections: (prev.customSections || []).map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                items: (sec.items || []).map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item
                ),
              }
            : sec
        ),
      })),
    [setResume]
  );
  const removeCustomItem = useCallback(
    (sectionId, itemId) =>
      setResume((prev) => ({
        ...prev,
        customSections: (prev.customSections || []).map((sec) =>
          sec.id === sectionId
            ? { ...sec, items: (sec.items || []).filter((i) => i.id !== itemId) }
            : sec
        ),
      })),
    [setResume]
  );
  const updateCustomSection = useCallback(
    (id, f, v) => updateItem('customSections', id, f, v),
    [updateItem]
  );
  const removeCustomSection = useCallback((id) => removeItem('customSections', id), [removeItem]);

  // ── Photo ──────────────────────────────────────────────────────
  const handlePhotoChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Please choose a JPG or PNG image.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be under 2 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result);
      setUploadError('');
    };
    reader.onerror = () => setUploadError('Could not read that file. Try another image.');
    reader.readAsDataURL(file);
    event.target.value = '';
  }, []);

  // ── Derived ────────────────────────────────────────────────────
  const sortedExperience = useMemo(
    () => sortByDateDesc(resume.experience || []),
    [resume.experience]
  );
  const sortedEducation = useMemo(
    () => sortByDateDesc(resume.education || []),
    [resume.education]
  );
  const skillsWithIds = useMemo(() => ensureSkillIds(resume.skills), [resume.skills]);
  const markerStyle = resume.markerStyle || 'number';

  return (
    <div className="space-y-5">
      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          onApply={(dataUrl) => {
            updateField('photo', dataUrl);
            setCropSrc(null);
          }}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* ── Document-wide formatting ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-inset px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink">List markers</p>
          <p className="mt-0.5 text-2xs text-ink-muted">
            Applies to skills, projects and custom sections.
          </p>
        </div>
        <Segmented
          size="sm"
          value={markerStyle}
          onChange={(v) => updateField('markerStyle', v)}
          options={MARKER_OPTIONS}
          ariaLabel="List marker style"
        />
      </div>

      {/* ── Personal ──────────────────────────────────────────── */}
      <Section id="personal" title="Personal details" step={1}>
        <div className="flex flex-col gap-5 sm:flex-row">
          <PhotoPicker
            photo={resume.photo}
            error={uploadError}
            onPick={handlePhotoChange}
            onCrop={() => setCropSrc(resume.photo)}
            onRemove={() => updateField('photo', '')}
          />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Full name"
                value={resume.name}
                placeholder="Ayesha Tariq"
                onChange={(v) => updateField('name', v)}
                maxLength={LIMITS.name}
                showCounter
              />
              <TextField
                label="Email"
                type="email"
                value={resume.email}
                placeholder="u2021458@giki.edu.pk"
                onChange={(v) => updateField('email', v)}
                maxLength={LIMITS.email}
              />
              <TextField
                label="Phone"
                value={resume.phone}
                placeholder="+92 336 214 8890"
                onChange={(v) => updateField('phone', v)}
                maxLength={LIMITS.phone}
              />
              <TextField
                label="Location"
                value={resume.location}
                placeholder="Topi, Khyber Pakhtunkhwa"
                onChange={(v) => updateField('location', v)}
                maxLength={LIMITS.location}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Links ─────────────────────────────────────────────── */}
      <Section id="links" title="Social links" step={2} hint="Shown under your contact details.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="LinkedIn"
            value={resume.linkedin}
            placeholder="linkedin.com/in/your-name"
            onChange={(v) => updateField('linkedin', v)}
            maxLength={LIMITS.socialLink}
          />
          <TextField
            label="GitHub"
            value={resume.github}
            placeholder="github.com/your-name"
            onChange={(v) => updateField('github', v)}
            maxLength={LIMITS.socialLink}
          />
          <TextField
            label="Portfolio or other"
            value={resume.others}
            placeholder="your-site.com"
            onChange={(v) => updateField('others', v)}
            maxLength={LIMITS.socialLink}
            className="sm:col-span-2"
          />
        </div>
      </Section>

      {/* ── Objective ─────────────────────────────────────────── */}
      <Section
        id="summary"
        title="Objective"
        step={3}
        hint="Two or three lines on the role you're after."
      >
        <TextArea
          value={resume.summary}
          onChange={(v) => updateField('summary', v)}
          rows={4}
          placeholder="Final-year Computer Science student looking for a graduate software engineering role…"
          maxLength={LIMITS.summary}
        />
      </Section>

      {/* ── Experience ────────────────────────────────────────── */}
      <Section
        id="experience"
        title="Experience"
        step={4}
        count={sortedExperience.length}
        hint="Newest first — ordering is automatic."
        onAdd={() =>
          addItem('experience', { company: '', role: '', from: null, to: null, description: '' })
        }
        addLabel="Add role"
      >
        {sortedExperience.length === 0 ? (
          <SectionEmpty
            text="No roles yet. Internships, part-time work and research assistantships all count."
            onAdd={() =>
              addItem('experience', { company: '', role: '', from: null, to: null, description: '' })
            }
            addLabel="Add your first role"
          />
        ) : (
          sortedExperience.map((ex, i) => (
            <ExperienceRow
              key={ex.id}
              index={i}
              item={ex}
              onUpdate={updateExperience}
              onRemove={removeExperience}
            />
          ))
        )}
      </Section>

      {/* ── Education ─────────────────────────────────────────── */}
      <Section
        id="education"
        title="Education"
        step={5}
        count={sortedEducation.length}
        onAdd={() => addItem('education', { school: '', degree: '', from: null, to: null })}
        addLabel="Add school"
      >
        {sortedEducation.length === 0 ? (
          <SectionEmpty
            text="Add your degree at GIKI, and your intermediate or A-levels."
            onAdd={() => addItem('education', { school: '', degree: '', from: null, to: null })}
            addLabel="Add education"
          />
        ) : (
          sortedEducation.map((ed, i) => (
            <EducationRow
              key={ed.id}
              index={i}
              item={ed}
              onUpdate={updateEducation}
              onRemove={removeEducation}
            />
          ))
        )}
      </Section>

      {/* ── Projects ──────────────────────────────────────────── */}
      <Section
        id="projects"
        title="Projects"
        step={6}
        count={(resume.projects || []).length}
        hint="Up to four appear on the printed page."
        onAdd={() => addItem('projects', { title: '', description: '', link: '' })}
        addLabel="Add project"
      >
        {(resume.projects || []).length === 0 ? (
          <SectionEmpty
            text="Course projects, side projects and competition entries are all worth listing."
            onAdd={() => addItem('projects', { title: '', description: '', link: '' })}
            addLabel="Add a project"
          />
        ) : (
          (resume.projects || []).map((pr, i) => (
            <ProjectRow
              key={pr.id}
              index={i}
              item={pr}
              onUpdate={updateProject}
              onRemove={removeProject}
            />
          ))
        )}
      </Section>

      {/* ── Skills ────────────────────────────────────────────── */}
      <Section
        id="skills"
        title="Skills"
        step={7}
        count={skillsWithIds.length}
        hint="Group them — 'Languages', 'Backend', 'Tools'. Up to eight print."
        onAdd={addSkill}
        addLabel="Add group"
      >
        {skillsWithIds.length === 0 ? (
          <SectionEmpty
            text="Group related skills so the page stays readable."
            onAdd={addSkill}
            addLabel="Add a skill group"
          />
        ) : (
          skillsWithIds.map((skill, i) => (
            <SkillRow
              key={skill.id}
              index={i}
              item={skill}
              onUpdate={updateSkill}
              onRemove={removeSkill}
            />
          ))
        )}
      </Section>

      {/* ── Custom sections ───────────────────────────────────── */}
      <Section
        id="custom"
        title="Custom sections"
        step={8}
        count={(resume.customSections || []).length}
        hint="Achievements, certifications, societies — anything else worth printing."
        onAdd={() => addItem('customSections', { title: '', items: [] })}
        addLabel="Add section"
      >
        {(resume.customSections || []).length === 0 ? (
          <SectionEmpty
            text="Optional. Add one if you have achievements or activities to show."
            onAdd={() => addItem('customSections', { title: '', items: [] })}
            addLabel="Add a custom section"
          />
        ) : (
          (resume.customSections || []).map((sec) => (
            <CustomSectionBlock
              key={sec.id}
              section={sec}
              onUpdateSection={updateCustomSection}
              onRemoveSection={removeCustomSection}
              onAddItem={addCustomItem}
              onUpdateItem={updateCustomItem}
              onRemoveItem={removeCustomItem}
            />
          ))
        )}
      </Section>
    </div>
  );
}

export default memo(ResumeForm);

/* ── Layout pieces ────────────────────────────────────────────── */

function Section({ id, title, step, hint, count, children, onAdd, addLabel }) {
  return (
    <section
      id={`section-${id}`}
      className="scroll-mt-24 rounded-lg border border-line bg-surface"
      aria-labelledby={`heading-${id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {step !== undefined && (
              <span
                aria-hidden
                className="tnum grid h-5 w-5 shrink-0 place-items-center rounded border border-line bg-inset text-2xs font-semibold text-ink-muted"
              >
                {step}
              </span>
            )}
            <h3 id={`heading-${id}`} className="text-sm font-semibold tracking-tight text-ink">
              {title}
            </h3>
            {count > 0 && <span className="tnum text-2xs text-ink-muted">{count}</span>}
          </div>
          {hint && <p className="mt-1 pl-7 text-xs leading-relaxed text-ink-muted">{hint}</p>}
        </div>
        {onAdd && (
          <Button size="sm" variant="secondary" onClick={onAdd}>
            <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
            </svg>
            {addLabel || 'Add'}
          </Button>
        )}
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function SectionEmpty({ text, onAdd, addLabel }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-inset px-4 py-5 text-center">
      <p className="mx-auto max-w-xs text-xs leading-relaxed text-ink-muted">{text}</p>
      {onAdd && (
        <Button size="sm" variant="secondary" className="mt-3" onClick={onAdd}>
          {addLabel || 'Add'}
        </Button>
      )}
    </div>
  );
}

/** A repeating entry: numbered, with a remove control in the header. */
const RepeatCard = memo(function RepeatCard({ index, label, onRemove, children }) {
  return (
    <div className="group rounded-md border border-line bg-inset/60 transition-colors focus-within:border-line-strong hover:border-line-strong">
      <div className="flex items-center justify-between gap-2 border-b border-line/80 px-3 py-2">
        <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
          {label} {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
          className="rounded p-1 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 5.5h10M6.5 5.5V4a1 1 0 011-1h1a1 1 0 011 1v1.5M5 5.5l.6 7a1 1 0 001 .9h2.8a1 1 0 001-.9l.6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="space-y-4 p-3.5">{children}</div>
    </div>
  );
});

/* ── Repeating rows (memoised individually) ───────────────────── */

const ExperienceRow = memo(function ExperienceRow({ index, item, onUpdate, onRemove }) {
  return (
    <RepeatCard index={index} label="Role" onRemove={() => onRemove(item.id)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Company"
          value={item.company}
          placeholder="Systems Limited"
          onChange={(v) => onUpdate(item.id, 'company', v)}
          maxLength={LIMITS.company}
        />
        <TextField
          label="Role"
          value={item.role}
          placeholder="Software Engineering Intern"
          onChange={(v) => onUpdate(item.id, 'role', v)}
          maxLength={LIMITS.role}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="From"
          value={item.from}
          onChange={(v) => onUpdate(item.id, 'from', v)}
          placeholder="Start date"
        />
        <DateField
          label="To"
          value={item.to}
          onChange={(v) => onUpdate(item.id, 'to', v)}
          placeholder="Present if blank"
          isClearable
        />
      </div>
      <TextArea
        label="What you did"
        value={item.description}
        placeholder="Start each line with an action and include a number where you can."
        onChange={(v) => onUpdate(item.id, 'description', v)}
        rows={4}
        maxLength={LIMITS.description}
      />
    </RepeatCard>
  );
});

const EducationRow = memo(function EducationRow({ index, item, onUpdate, onRemove }) {
  return (
    <RepeatCard index={index} label="School" onRemove={() => onRemove(item.id)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Institution"
          value={item.school}
          placeholder="Ghulam Ishaq Khan Institute"
          onChange={(v) => onUpdate(item.id, 'school', v)}
          maxLength={LIMITS.school}
        />
        <TextField
          label="Degree or programme"
          value={item.degree}
          placeholder="BS Computer Science"
          onChange={(v) => onUpdate(item.id, 'degree', v)}
          maxLength={LIMITS.degree}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="From"
          value={item.from}
          onChange={(v) => onUpdate(item.id, 'from', v)}
          placeholder="Start date"
        />
        <DateField
          label="To"
          value={item.to}
          onChange={(v) => onUpdate(item.id, 'to', v)}
          placeholder="Present if blank"
          isClearable
        />
      </div>
    </RepeatCard>
  );
});

const ProjectRow = memo(function ProjectRow({ index, item, onUpdate, onRemove }) {
  return (
    <RepeatCard index={index} label="Project" onRemove={() => onRemove(item.id)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Title"
          value={item.title}
          placeholder="Raft-based key-value store"
          onChange={(v) => onUpdate(item.id, 'title', v)}
          maxLength={LIMITS.projectTitle}
        />
        <TextField
          label="Link"
          value={item.link}
          placeholder="github.com/you/project"
          onChange={(v) => onUpdate(item.id, 'link', v)}
          maxLength={LIMITS.projectLink}
        />
      </div>
      <TextArea
        label="Description"
        value={item.description}
        placeholder={'One line per point:\n- Built X with Y\n- Handled Z requests/second'}
        onChange={(v) => onUpdate(item.id, 'description', v)}
        rows={4}
        maxLength={LIMITS.description}
      />
    </RepeatCard>
  );
});

const SkillRow = memo(function SkillRow({ index, item, onUpdate, onRemove }) {
  return (
    <RepeatCard index={index} label="Group" onRemove={() => onRemove(item.id)}>
      <TextField
        label="Group name"
        value={item.name}
        placeholder="Languages"
        onChange={(v) => onUpdate(item.id, 'name', v)}
        maxLength={LIMITS.skillName}
      />
      <TextArea
        label="Details"
        value={item.description}
        placeholder="Go, Python, TypeScript, SQL"
        onChange={(v) => onUpdate(item.id, 'description', v)}
        rows={2}
        maxLength={LIMITS.skillDesc}
      />
    </RepeatCard>
  );
});

const CustomSectionBlock = memo(function CustomSectionBlock({
  section,
  onUpdateSection,
  onRemoveSection,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}) {
  const items = section.items || [];
  return (
    <div className="rounded-md border border-line bg-inset/60">
      <div className="flex items-center justify-between gap-2 border-b border-line/80 px-3 py-2">
        <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
          Section
        </span>
        <button
          type="button"
          onClick={() => onRemoveSection(section.id)}
          aria-label="Remove custom section"
          className="rounded p-1 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 5.5h10M6.5 5.5V4a1 1 0 011-1h1a1 1 0 011 1v1.5M5 5.5l.6 7a1 1 0 001 .9h2.8a1 1 0 001-.9l.6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="space-y-4 p-3.5">
        <TextField
          label="Section title"
          value={section.title}
          placeholder="Achievements"
          onChange={(v) => onUpdateSection(section.id, 'title', v)}
          maxLength={LIMITS.customTitle}
        />

        {items.length > 0 && (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.id} className="rounded border border-line bg-surface p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-2xs font-medium uppercase tracking-wide text-ink-muted">
                    Item
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(section.id, item.id)}
                    aria-label="Remove item"
                    className="rounded p-0.5 text-ink-muted transition-colors hover:text-danger"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <TextField
                    label="Name"
                    value={item.name}
                    placeholder="ICPC Regionals 2024"
                    onChange={(v) => onUpdateItem(section.id, item.id, 'name', v)}
                    maxLength={LIMITS.customName}
                  />
                  <TextArea
                    label="Detail"
                    value={item.description}
                    placeholder="Ranked 11th of 120 teams."
                    onChange={(v) => onUpdateItem(section.id, item.id, 'description', v)}
                    rows={2}
                    maxLength={LIMITS.customDesc}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button size="sm" variant="ghost" onClick={() => onAddItem(section.id)}>
          <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
          </svg>
          Add item
        </Button>
      </div>
    </div>
  );
});

/* ── Photo ────────────────────────────────────────────────────── */

function PhotoPicker({ photo, error, onPick, onCrop, onRemove }) {
  return (
    <div className="flex shrink-0 items-start gap-4 sm:w-[7.5rem] sm:flex-col sm:items-stretch">
      <div className="relative h-[6.4rem] w-20 shrink-0 overflow-hidden rounded border border-line bg-inset sm:w-full">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Your profile photo" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center px-2 text-center">
            <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7 text-line-strong" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="12" cy="9" r="3.4" />
              <path d="M4.5 19.5c1.5-3.4 4.5-5 7.5-5s6 1.6 7.5 5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
        <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:border-line-strong hover:bg-inset">
          {photo ? 'Replace' : 'Upload photo'}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={onPick}
          />
        </label>
        {photo && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onCrop}>
              Crop
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove} className="hover:text-danger">
              Remove
            </Button>
          </div>
        )}
        <p className="text-2xs leading-relaxed text-ink-muted">JPG or PNG, under 2 MB.</p>
        {error && <p className="text-2xs leading-relaxed text-danger">{error}</p>}
      </div>
    </div>
  );
}

/* ── Date input ───────────────────────────────────────────────── */

function DateField({ label, value, onChange, placeholder, isClearable = false }) {
  const selected = value instanceof Date ? value : value ? new Date(value) : null;
  const valid = selected && !Number.isNaN(selected.getTime()) ? selected : null;

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <DatePicker
        selected={valid}
        onChange={(date) => onChange(date)}
        placeholderText={placeholder}
        dateFormat="MMM yyyy"
        showMonthYearPicker
        showFullMonthYearPicker
        isClearable={isClearable}
        autoComplete="off"
        popperPlacement="bottom-start"
        wrapperClassName="block w-full"
        className={cn(
          'h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink transition-[border-color,box-shadow]',
          'placeholder:text-ink-muted/60 hover:border-line-strong',
          'focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/15'
        )}
      />
    </div>
  );
}

/* ── Crop modal ───────────────────────────────────────────────── */

function CropModal({ imageSrc, onApply, onCancel }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const containerRef = useRef(null);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const minScale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    setScale(Math.max(minScale, 1));
    setOffset({ x: 0, y: 0 });
  };

  const startDrag = (clientX, clientY) => {
    dragRef.current = { startX: clientX - offset.x, startY: clientY - offset.y };
  };
  const moveDrag = (clientX, clientY) => {
    if (!dragRef.current) return;
    setOffset({ x: clientX - dragRef.current.startX, y: clientY - dragRef.current.startY });
  };
  const stopDrag = () => {
    dragRef.current = null;
  };

  // Non-passive touchmove so dragging doesn't scroll the page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const handler = (e) => {
      if (dragRef.current) e.preventDefault();
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, []);

  function handleApply() {
    const img = imgRef.current;
    if (!img) return;
    const OUTPUT = 400;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);

    const iW = img.naturalWidth;
    const iH = img.naturalHeight;
    const imgLeft = CROP_SIZE / 2 + offset.x - (iW * scale) / 2;
    const imgTop = CROP_SIZE / 2 + offset.y - (iH * scale) / 2;
    const srcX = -imgLeft / scale;
    const srcY = -imgTop / scale;
    const srcSize = CROP_SIZE / scale;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);
    onApply(canvas.toDataURL('image/jpeg', 0.88));
  }

  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      title="Crop your photo"
      description="Drag to reposition, then zoom to frame it."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={handleApply}>
            Use photo
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center">
        <div
          ref={containerRef}
          className="relative cursor-grab overflow-hidden rounded border border-line bg-inset active:cursor-grabbing"
          style={{ width: CROP_SIZE, height: CROP_SIZE }}
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={stopDrag}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            draggable={false}
            onLoad={handleImgLoad}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
              transformOrigin: 'center',
              maxWidth: 'none',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          {/* Shows the 100×120 print aspect the CV actually uses. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)' }}
          />
        </div>

        <div className="mt-4 flex w-full items-center gap-3">
          <span aria-hidden className="text-xs text-ink-muted">
            −
          </span>
          <input
            type="range"
            min="0.1"
            max="4"
            step="0.01"
            value={scale}
            aria-label="Zoom"
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span aria-hidden className="text-xs text-ink-muted">
            +
          </span>
        </div>
      </div>
    </Modal>
  );
}
