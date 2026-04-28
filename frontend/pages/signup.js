// frontend/pages/signup.js
// ---------------------------------------------------------------
// Create an account. Redirects to / on success.
// ---------------------------------------------------------------

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { AuthShell, Field } from './login';

export default function SignupPage() {
  const router = useRouter();
  const { status, signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await signup({ email: email.trim(), password, fullName: fullName.trim() || null });
      router.replace('/');
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head><title>Create account — Cviator Pro</title></Head>
      <AuthShell title="Create your account" subtitle="Save your CV and pick up where you left off.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Full name"
            value={fullName}
            onChange={setFullName}
            placeholder="Ada Lovelace"
            autoComplete="name"
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
          />
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
