// frontend/pages/signup.js
// Create an account.
//   • Student → u<7-digits>@giki.edu.pk, plus reg no / faculty / batch
//   • Admin   → any @giki.edu.pk address; stays 'pending' until the root
//               admin approves (via the emailed link or the dashboard).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { signupRaw } from '../services/auth';
import { API_URL } from '../services/api';
import AuthLayout from '../components/AuthLayout';
import { Alert, Button, SelectField, Segmented, TextField } from '../components/ui';

const STUDENT_EMAIL_RE = /^u\d{7}@giki\.edu\.pk$/i;
const ADMIN_EMAIL_RE = /^[a-z0-9._-]+@giki\.edu\.pk$/i;

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'admin', label: 'Staff / Admin' },
];

export default function SignupPage() {
  const router = useRouter();
  const { status, user, setSession } = useAuth();

  const [role, setRole] = useState('student');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [regNo, setRegNo] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [batch, setBatch] = useState('');

  const [faculties, setFaculties] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(user?.isAdmin ? '/admin' : '/');
    }
  }, [status, user, router]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/public/faculties`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => {
        if (!cancelled) setFaculties(d.faculties || []);
      })
      .catch(() => {
        if (!cancelled) setFaculties([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFaculty = useMemo(
    () => faculties.find((f) => String(f.id) === String(facultyId)),
    [faculties, facultyId]
  );
  const showDepartment = !!selectedFaculty && selectedFaculty.departments.length > 1;

  useEffect(() => {
    setDepartmentId('');
  }, [facultyId]);

  function validate() {
    const errs = {};
    const e = email.trim().toLowerCase();

    if (!firstName.trim()) errs.firstName = 'Required.';
    if (!lastName.trim()) errs.lastName = 'Required.';

    if (role === 'student' && !STUDENT_EMAIL_RE.test(e)) {
      errs.email = 'Use your student address: u#######@giki.edu.pk';
    } else if (role === 'admin' && !ADMIN_EMAIL_RE.test(e)) {
      errs.email = 'A @giki.edu.pk address is required.';
    }

    if (password.length < 8) errs.password = 'At least 8 characters.';

    if (role === 'student') {
      if (!/^\d{7}$/.test(regNo.trim())) errs.regNo = 'Must be exactly 7 digits.';
      if (!/^(19|20)\d{2}$/.test(batch.trim())) errs.batch = 'Four-digit year, e.g. 2024.';
      if (!facultyId) errs.facultyId = 'Select your faculty.';
      if (showDepartment && !departmentId) errs.departmentId = 'Select your department.';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      if (role === 'student') {
        Object.assign(payload, {
          regNo: regNo.trim(),
          facultyId: Number(facultyId),
          departmentId: departmentId ? Number(departmentId) : undefined,
          batch: batch.trim(),
        });
      }

      const result = await signupRaw(payload);

      if (result.token && result.user) {
        setSession(result.token, result.user);
        router.replace(result.user.isAdmin ? '/admin' : '/');
        return;
      }
      if (result.needsVerification) {
        if (result.devLink) router.replace(result.devLink);
        else router.replace(`/verify-email?email=${encodeURIComponent(result.email)}&new=1`);
        return;
      }
      if (result.pendingApproval) {
        router.replace(
          `/signup-pending?email=${encodeURIComponent(result.email)}${
            result.devLink ? `&devLink=${encodeURIComponent(result.devLink)}` : ''
          }`
        );
        return;
      }
      setBusy(false);
    } catch (err) {
      setError(err.message || 'Could not create account.');
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      pageTitle="Create account"
      title="Create your account"
      subtitle="Your institute email is used to verify you belong to GIKI."
      footer={
        <p className="text-sm text-ink-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">I am a</span>
          <Segmented
            value={role}
            onChange={setRole}
            options={ROLE_OPTIONS}
            ariaLabel="Account type"
            className="w-full [&>button]:flex-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="First name"
            value={firstName}
            onChange={setFirstName}
            error={fieldErrors.firstName}
            maxLength={50}
            autoComplete="given-name"
            required
          />
          <TextField
            label="Last name"
            value={lastName}
            onChange={setLastName}
            error={fieldErrors.lastName}
            maxLength={50}
            autoComplete="family-name"
            required
          />
        </div>

        <TextField
          label="GIKI email"
          type="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
          hint={role === 'student' ? 'Format: u#######@giki.edu.pk' : 'Any @giki.edu.pk mailbox.'}
          placeholder={role === 'student' ? 'u2021458@giki.edu.pk' : 'your.name@giki.edu.pk'}
          autoComplete="email"
          required
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          hint="At least 8 characters."
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />

        {role === 'student' && (
          <div className="space-y-4 border-t border-line pt-5">
            <p className="eyebrow">Student details</p>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Registration number"
                value={regNo}
                onChange={setRegNo}
                error={fieldErrors.regNo}
                maxLength={7}
                inputMode="numeric"
                placeholder="2021458"
                inputClassName="ident"
                required
              />
              <TextField
                label="Batch"
                value={batch}
                onChange={setBatch}
                error={fieldErrors.batch}
                maxLength={4}
                inputMode="numeric"
                placeholder="2021"
                inputClassName="ident"
                required
              />
            </div>

            <SelectField
              label="Faculty"
              value={facultyId}
              onChange={setFacultyId}
              error={fieldErrors.facultyId}
              placeholder={faculties.length ? 'Select your faculty…' : 'Loading faculties…'}
              options={faculties.map((f) => ({ value: String(f.id), label: f.name }))}
              required
            />

            {showDepartment && (
              <SelectField
                label="Department"
                value={departmentId}
                onChange={setDepartmentId}
                error={fieldErrors.departmentId}
                placeholder="Select your department…"
                options={selectedFaculty.departments.map((d) => ({
                  value: String(d.id),
                  label: d.name,
                }))}
                required
              />
            )}
          </div>
        )}

        {role === 'admin' && (
          <Alert tone="warning" title="Approval required">
            Staff accounts are reviewed by the institute&apos;s root administrator. You&apos;ll get
            an email once your access is approved.
          </Alert>
        )}

        {error && <Alert tone="danger">{error}</Alert>}

        <div>
          <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
            {busy ? 'Creating account…' : 'Create account'}
          </Button>
          {busy && (
            <p className="mt-2 text-center text-xs text-ink-muted">
              Sending your confirmation email — this can take up to a minute.
            </p>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
