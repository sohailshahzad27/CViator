// frontend/components/ResumeForm.js
// Resume form — flat white cards, one heading per section.
//
// Education & Experience:  calendar date pickers, sorted descending by date,
//   stable IDs so reorder keeps React reconciliation correct.
// Projects, Skills:        stable IDs for consistent keys.
// Custom sections:         section title + unlimited named items with optional description.
// Formatting bar:          global marker-style selector (Numbers / Dots / None).

import { memo, useCallback, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { uid, withId, sortByDateDesc, normalizeSkills } from '../utils/resume';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MARKER_OPTIONS = [
  { value: 'number', label: '1. 2.' },
  { value: 'dot',    label: '• Dot' },
  { value: 'none',   label: 'None'  },
];

// Ensure every skill has an id (normalizeSkills from utils strips them).
function ensureSkillIds(skills = []) {
  return (skills || []).map((s) =>
    typeof s === 'string'
      ? { id: uid(), name: s, description: '' }
      : { id: s.id || uid(), name: s.name || '', description: s.description || '' }
  );
}

function ResumeForm({ resume, setResume }) {
  const [uploadError, setUploadError] = useState('');

  // ── Generic field helpers ────────────────────────────────────
  const updateField = useCallback((key, value) => {
    setResume((prev) => ({ ...prev, [key]: value }));
  }, [setResume]);

  const updateArrayItemById = useCallback((key, id, field, value) => {
    setResume((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }, [setResume]);

  const addArrayItem = useCallback((key, blank) => {
    setResume((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), withId(blank)],
    }));
  }, [setResume]);

  const removeArrayItemById = useCallback((key, id) => {
    setResume((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((item) => item.id !== id),
    }));
  }, [setResume]);

  // ── Skills (use ensureSkillIds so operations are ID-safe) ────
  const addSkill = useCallback(() => {
    setResume((prev) => ({
      ...prev,
      skills: [...ensureSkillIds(prev.skills), { id: uid(), name: '', description: '' }],
    }));
  }, [setResume]);

  const updateSkill = useCallback((id, field, value) => {
    setResume((prev) => ({
      ...prev,
      skills: ensureSkillIds(prev.skills).map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  }, [setResume]);

  const removeSkill = useCallback((id) => {
    setResume((prev) => ({
      ...prev,
      skills: ensureSkillIds(prev.skills).filter((s) => s.id !== id),
    }));
  }, [setResume]);

  // ── Custom section items ─────────────────────────────────────
  const addCustomSectionItem = useCallback((sectionId) => {
    setResume((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).map((sec) =>
        sec.id === sectionId
          ? { ...sec, items: [...(sec.items || []), { id: uid(), name: '', description: '' }] }
          : sec
      ),
    }));
  }, [setResume]);

  const updateCustomSectionItem = useCallback((sectionId, itemId, field, value) => {
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
    }));
  }, [setResume]);

  const removeCustomSectionItem = useCallback((sectionId, itemId) => {
    setResume((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).map((sec) =>
        sec.id === sectionId
          ? { ...sec, items: (sec.items || []).filter((item) => item.id !== itemId) }
          : sec
      ),
    }));
  }, [setResume]);

  // ── Photo upload ─────────────────────────────────────────────
  const handlePhotoChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Please upload a JPG or PNG image.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be under 2 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload  = () => { updateField('photo', reader.result); setUploadError(''); };
    reader.onerror = () => setUploadError('Could not read that file. Try another image.');
    reader.readAsDataURL(file);
  }, [updateField]);

  // ── Memoised derived data ─────────────────────────────────────
  const sortedExperience = useMemo(() => sortByDateDesc(resume.experience || []), [resume.experience]);
  const sortedEducation  = useMemo(() => sortByDateDesc(resume.education  || []), [resume.education]);
  const skillsWithIds    = useMemo(() => ensureSkillIds(resume.skills),           [resume.skills]);
  const markerStyle      = resume.markerStyle || 'number';

  return (
    <div className="space-y-6">

      {/* ── Formatting ──────────────────────────────────────── */}
      <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Formatting
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">List markers</span>
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
              {MARKER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('markerStyle', opt.value)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    markerStyle === opt.value
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Personal information ─────────────────────────────── */}
      <Section title="Personal information">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-shrink-0 items-start gap-4 sm:flex-col sm:items-center sm:gap-3">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {resume.photo ? (
                <img src={resume.photo} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <PhotoPlaceholder />
              )}
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-center">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
                {resume.photo ? 'Change' : 'Upload'}
                <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden" onChange={handlePhotoChange} />
              </label>
              {resume.photo && (
                <button type="button" onClick={() => updateField('photo', '')} className="text-[11px] text-slate-400 hover:text-red-600">
                  Remove
                </button>
              )}
              <p className="text-[11px] text-slate-400">JPG or PNG, &lt;=2 MB</p>
              {uploadError && <p className="max-w-[10rem] text-[11px] text-red-600">{uploadError}</p>}
            </div>
          </div>

          <div className="flex-1">
            <Grid>
              <Input label="Full name"  value={resume.name}     placeholder="Enter your full name"     onChange={(v) => updateField('name', v)} />
              <Input label="Email"      value={resume.email}    placeholder="Enter your email address" onChange={(v) => updateField('email', v)} />
              <Input label="Phone"      value={resume.phone}    placeholder="Enter your phone number"  onChange={(v) => updateField('phone', v)} />
              <Input label="Location"   value={resume.location} placeholder="Enter your location"      onChange={(v) => updateField('location', v)} />
            </Grid>
          </div>
        </div>
      </Section>

      {/* ── Social links ─────────────────────────────────────── */}
      <Section title="Social links">
        <Grid>
          <Input label="LinkedIn URL" value={resume.linkedin} placeholder="linkedin.com/in/your-name" onChange={(v) => updateField('linkedin', v)} />
          <Input label="GitHub URL"   value={resume.github}   placeholder="github.com/your-name"       onChange={(v) => updateField('github', v)} />
        </Grid>
      </Section>

      {/* ── Summary ──────────────────────────────────────────── */}
      <Section title="Professional summary">
        <Textarea value={resume.summary} onChange={(v) => updateField('summary', v)} rows={4} placeholder="Write a short professional summary..." />
      </Section>

      {/* ── Experience ───────────────────────────────────────── */}
      <Section
        title="Experience"
        onAdd={() => addArrayItem('experience', { company: '', role: '', from: null, to: null, description: '' })}
      >
        {sortedExperience.map((ex) => (
          <RepeatItem key={ex.id} onRemove={() => removeArrayItemById('experience', ex.id)}>
            <Grid>
              <Input label="Company" value={ex.company} placeholder="Enter company name" onChange={(v) => updateArrayItemById('experience', ex.id, 'company', v)} />
              <Input label="Role"    value={ex.role}    placeholder="Enter your role"    onChange={(v) => updateArrayItemById('experience', ex.id, 'role', v)} />
            </Grid>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePickerInput label="From" value={ex.from} onChange={(v) => updateArrayItemById('experience', ex.id, 'from', v)} placeholder="Select start date" />
              <DatePickerInput label="To"   value={ex.to}   onChange={(v) => updateArrayItemById('experience', ex.id, 'to', v)}   placeholder="Present if blank" isClearable />
            </div>
            <Textarea label="Description" value={ex.description} placeholder="Describe your experience..." onChange={(v) => updateArrayItemById('experience', ex.id, 'description', v)} rows={4} />
          </RepeatItem>
        ))}
      </Section>

      {/* ── Education ────────────────────────────────────────── */}
      <Section
        title="Education"
        onAdd={() => addArrayItem('education', { school: '', degree: '', from: null, to: null })}
      >
        {sortedEducation.map((ed) => (
          <RepeatItem key={ed.id} onRemove={() => removeArrayItemById('education', ed.id)}>
            <Grid>
              <Input label="School" value={ed.school} placeholder="Enter school name"       onChange={(v) => updateArrayItemById('education', ed.id, 'school', v)} />
              <Input label="Degree" value={ed.degree} placeholder="Enter degree or program" onChange={(v) => updateArrayItemById('education', ed.id, 'degree', v)} />
            </Grid>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePickerInput label="From" value={ed.from} onChange={(v) => updateArrayItemById('education', ed.id, 'from', v)} placeholder="Select start date" />
              <DatePickerInput label="To"   value={ed.to}   onChange={(v) => updateArrayItemById('education', ed.id, 'to', v)}   placeholder="Present if blank" isClearable />
            </div>
          </RepeatItem>
        ))}
      </Section>

      {/* ── Projects ─────────────────────────────────────────── */}
      <Section
        title="Projects"
        onAdd={() => addArrayItem('projects', { title: '', description: '', link: '' })}
      >
        {(resume.projects || []).map((pr) => (
          <RepeatItem key={pr.id} onRemove={() => removeArrayItemById('projects', pr.id)}>
            <Grid>
              <Input label="Title" value={pr.title} placeholder="Enter project title" onChange={(v) => updateArrayItemById('projects', pr.id, 'title', v)} />
              <Input label="Link"  value={pr.link}  placeholder="Enter project link"  onChange={(v) => updateArrayItemById('projects', pr.id, 'link', v)} />
            </Grid>
            <Textarea label="Description" value={pr.description} placeholder="Describe your project..." onChange={(v) => updateArrayItemById('projects', pr.id, 'description', v)} rows={4} />
          </RepeatItem>
        ))}
      </Section>

      {/* ── Skills ───────────────────────────────────────────── */}
      <Section title="Skills" onAdd={addSkill}>
        {skillsWithIds.map((skill) => (
          <RepeatItem key={skill.id} onRemove={() => removeSkill(skill.id)}>
            <Input label="Skill / Category" value={skill.name} placeholder="E.g. Languages, React, Python…" onChange={(v) => updateSkill(skill.id, 'name', v)} />
            <Textarea label="Description (optional)" value={skill.description} placeholder="Add a short description if you want..." onChange={(v) => updateSkill(skill.id, 'description', v)} rows={3} />
          </RepeatItem>
        ))}
      </Section>

      {/* ── Custom sections ──────────────────────────────────── */}
      <Section
        title="Custom sections"
        onAdd={() => addArrayItem('customSections', { title: '', items: [] })}
      >
        {(resume.customSections || []).map((sec) => (
          <RepeatItem key={sec.id} onRemove={() => removeArrayItemById('customSections', sec.id)}>
            <Input
              label="Section title"
              value={sec.title}
              placeholder="E.g. Certifications, Languages…"
              onChange={(v) => updateArrayItemById('customSections', sec.id, 'title', v)}
            />
            <div className="space-y-2">
              {(sec.items || []).map((item) => (
                <InnerItem
                  key={item.id}
                  onRemove={() => removeCustomSectionItem(sec.id, item.id)}
                >
                  <Input
                    label="Name"
                    value={item.name}
                    placeholder="Item name"
                    onChange={(v) => updateCustomSectionItem(sec.id, item.id, 'name', v)}
                  />
                  <Textarea
                    label="Description (optional)"
                    value={item.description}
                    placeholder="Add a short description if you want…"
                    onChange={(v) => updateCustomSectionItem(sec.id, item.id, 'description', v)}
                    rows={2}
                  />
                </InnerItem>
              ))}
              <button
                type="button"
                onClick={() => addCustomSectionItem(sec.id)}
                className="mt-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                + Add item
              </button>
            </div>
          </RepeatItem>
        ))}
      </Section>
    </div>
  );
}

export default memo(ResumeForm);

// ── Layout helpers ────────────────────────────────────────────────

function Section({ title, children, onAdd }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">{title}</h3>
        {onAdd && (
          <button type="button" onClick={onAdd} className="text-xs font-medium text-slate-600 hover:text-slate-900">
            + Add
          </button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

const RepeatItem = memo(function RepeatItem({ children, onRemove }) {
  return (
    <div className="relative rounded-md border border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-3 top-3 text-xs font-medium text-slate-400 hover:text-red-600"
        aria-label="Remove"
      >
        Remove
      </button>
      <div className="space-y-4 pr-16">{children}</div>
    </div>
  );
});

function InnerItem({ children, onRemove }) {
  return (
    <div className="relative rounded border border-slate-200 bg-white p-3 pr-14">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 text-[11px] text-slate-400 hover:text-red-600"
        aria-label="Remove item"
      >
        Remove
      </button>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const Input = memo(function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type="text"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
});

const Textarea = memo(function Textarea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>}
      <textarea
        rows={rows}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
});

const DatePickerInput = memo(function DatePickerInput({ label, value, onChange, placeholder, isClearable = false }) {
  const selected = value instanceof Date
    ? value
    : (value ? new Date(value) : null);

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <DatePicker
        selected={selected && !Number.isNaN(selected.getTime()) ? selected : null}
        onChange={(date) => onChange(date)}
        placeholderText={placeholder}
        dateFormat="MMM d, yyyy"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        isClearable={isClearable}
        autoComplete="off"
        popperPlacement="bottom-start"
        wrapperClassName="block w-full"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
});

function PhotoPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full p-4 text-slate-400" aria-hidden="true">
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 19.5c1.5-3.5 4.5-5 7.5-5s6 1.5 7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
