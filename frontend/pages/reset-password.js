// frontend/pages/reset-password.js
// Reached from the password-reset email: /reset-password?token=...

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { resetPassword } from '../services/auth';
import AuthLayout from '../components/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  // router.query is empty on the very first render, so only treat the token
  // as missing once the router has actually parsed the URL.
  const tokenMissing = router.isReady && !token;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const errs = {};
    if (password.length < 8) errs.password = 'At least 8 characters.';
    if (password !== confirm) errs.confirm = 'Passwords do not match.';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!token) {
      setError('No reset token found in this link. Request a new one.');
      return;
    }

    setBusy(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.replace('/login?verified=1'), 1800);
    } catch (err) {
      setError(err.message || 'Could not reset your password.');
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      pageTitle="Reset password"
      title={success ? 'Password updated' : 'Set a new password'}
      subtitle={success ? undefined : 'Choose a password you don’t use anywhere else.'}
      footer={
        <p className="text-sm text-ink-muted">
          <Link href="/login" className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
            Back to sign in
          </Link>
        </p>
      }
    >
      {success ? (
        <Alert tone="success" title="All set">
          Your password has been changed. Taking you to sign in…
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {tokenMissing && (
            <Alert tone="warning" title="Link incomplete">
              This link is missing its reset token. Request a new one from the{' '}
              <Link href="/forgot-password" className="underline underline-offset-2">
                forgot password
              </Link>{' '}
              page.
            </Alert>
          )}

          <TextField
            label="New password"
            type="password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            hint="At least 8 characters."
            placeholder="••••••••"
            autoComplete="new-password"
            autoFocus
            required
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            error={fieldErrors.confirm}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />

          {error && <Alert tone="danger">{error}</Alert>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            disabled={tokenMissing}
            className="w-full"
          >
            {busy ? 'Saving…' : 'Set new password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
