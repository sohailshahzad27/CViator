// frontend/pages/forgot-password.js
// Enter email → backend sends a reset link (or logs it when SMTP is off).
// Always reports the same result so account existence isn't leaked.

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '../services/auth';
import AuthLayout from '../components/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not process that request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      pageTitle="Forgot password"
      title={submitted ? 'Check your inbox' : 'Reset your password'}
      subtitle={
        submitted
          ? undefined
          : 'We’ll email you a link to choose a new password. The link expires in one hour.'
      }
      footer={
        <p className="text-sm text-ink-muted">
          <Link href="/login" className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
            Back to sign in
          </Link>
        </p>
      }
    >
      {submitted ? (
        <Alert tone="success" title="Reset link sent">
          If <span className="font-medium">{email.trim()}</span> is registered, a reset link is on
          its way. Check your spam folder if it hasn&apos;t arrived in a few minutes.
        </Alert>
      ) : (
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

          {error && <Alert tone="danger">{error}</Alert>}

          <div>
            <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
            {busy && (
              <p className="mt-2 text-center text-xs text-ink-muted">
                This can take up to a minute — please don&apos;t refresh.
              </p>
            )}
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
