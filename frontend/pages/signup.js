// frontend/pages/signup.js
// ---------------------------------------------------------------
// Create an account. Two roles: student, admin.
//   • Student → first/last name, email, password, reg no, faculty, batch
//   • Admin   → first/last name, email, password + admin signup code
// On success, students land on /, admins on /admin.
// ---------------------------------------------------------------

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { AuthShell, Field } from './login';

const FACULTIES = [
  'Faculty of Computer Sciences and Engineering',
  'Faculty of Electrical Engineering',
  'Faculty of Mechanical Engineering',
  'Faculty of Materials and Chemical Engineering',
  'Faculty of Engineering Sciences',
  'Faculty of Management Sciences',
];

export default function SignupPage() {
  const router = useRouter();
  const { status, signup, user } = useAuth();

  const [role,        setRole]        = useState('student');
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');

  // Student-only
  const [regNo,    setRegNo]    = useState('');
  const [faculty,  setFaculty]  = useState('');
  const [batch,    setBatch]    = useState('');

  // Admin-only
  const [adminCode, setAdminCode] = useState('');

  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(user?.isAdmin ? '/admin' : '/');
    }
  }, [status, user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        email: email.trim(),
        password,
        role,
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
      };
      if (role === 'student') {
        Object.assign(payload, {
          regNo:   regNo.trim(),
          faculty: faculty.trim(),
          batch:   batch.trim(),
        });
      } else if (role === 'admin') {
        payload.adminCode = adminCode.trim();
      }

      const u = await signup(payload);
      router.replace(u?.isAdmin ? '/admin' : '/');
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head><title>Create account — Cviator Pro</title></Head>
      <AuthShell title="Create your account" subtitle="Join your university's CV portal.">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">I am a</span>
            <div className="inline-flex w-full rounded-md border border-slate-200 bg-white p-0.5">
              {[
                { value: 'student', label: 'Student' },
                { value: 'admin',   label: 'Admin'   },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition ${
                    role === opt.value
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={firstName} onChange={setFirstName} required maxLength={50} autoComplete="given-name" />
            <Field label="Last name"  value={lastName}  onChange={setLastName}  required maxLength={50} autoComplete="family-name" />
          </div>
          <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" placeholder="you@giki.edu.pk" />
          <Field label="Password" type="password" value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />

          {role === 'student' && (
            <>
              <Field label="Registration number" value={regNo} onChange={setRegNo} required maxLength={20} placeholder="e.g. 2018128" />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Faculty</span>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Select your faculty…</option>
                  {FACULTIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <Field label="Batch / Year" value={batch} onChange={setBatch} required maxLength={10} placeholder="e.g. 2024" />
            </>
          )}

          {role === 'admin' && (
            <Field
              label="Admin signup code"
              type="password"
              value={adminCode}
              onChange={setAdminCode}
              required
              placeholder="Provided by IT department"
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </AuthShell>
    </>
  );
}
