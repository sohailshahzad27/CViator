// frontend/pages/login.js
// Email + password sign-in. Redirects to the builder (students) or the
// dashboard (admins) on success.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { status, user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const justVerified = router.query.verified === '1';

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(user?.isAdmin ? '/admin' : '/');
    }
  }, [status, user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login({ email: email.trim(), password });
      router.replace(u?.isAdmin ? '/admin' : '/');
    } catch (err) {
      if (err.needsVerification) {
        router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      if (err.pendingApproval) {
        router.replace(`/signup-pending?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError(err.message || 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      pageTitle="Sign in"
      title="Welcome back"
      subtitle="Sign in to keep building your CV."
      footer={
        <p className="text-sm text-ink-muted">
          New here?{' '}
          <Link href="/signup" className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
            Create an account
          </Link>
        </p>
      }
    >
      {justVerified && (
        <Alert tone="success" className="mb-5">
          Email verified. You can sign in now.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label="GIKI email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="u2021458@giki.edu.pk"
          autoComplete="email"
          autoFocus
          required
        />
        <div>
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <div className="mt-1.5 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-ink-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
