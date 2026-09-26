// frontend/pages/verify-email.js
// Two modes, decided by the URL:
//   ?new=1&email=…  → post-signup "check your inbox"
//   ?token=…        → the user clicked the emailed link; verify and redirect
//
// Nothing renders until the router has parsed the query, otherwise the inbox
// screen flashes for a moment before the token check starts.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { verifyEmailToken, resendVerification } from '../services/auth';
import AuthLayout from '../components/AuthLayout';
import { Alert, Button, Spinner } from '../components/ui';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token, email, new: isNew } = router.query;

  const [tokenState, setTokenState] = useState('verifying'); // verifying | error
  const [resendState, setResendState] = useState('idle');    // idle | sending | sent | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    setTokenState('verifying');
    verifyEmailToken(token)
      .then(() => router.replace('/login?verified=1'))
      .catch((err) => {
        setTokenState('error');
        setMessage(err.message || 'This link is invalid or has expired.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleResend() {
    const addr = typeof email === 'string' ? email : '';
    if (!addr || resendState === 'sending') return;
    setResendState('sending');
    setMessage('');
    try {
      const result = await resendVerification(addr);
      if (result?.devLink) {
        router.replace(result.devLink);
        return;
      }
      setResendState('sent');
    } catch (err) {
      setResendState('error');
      setMessage(err.message || 'Could not resend that email.');
    }
  }

  const backToSignIn = (
    <p className="text-sm text-ink-muted">
      <Link href="/login" className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
        Back to sign in
      </Link>
    </p>
  );

  const resendBlock = email && resendState !== 'sent' && (
    <div className="mt-5">
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={handleResend}
        loading={resendState === 'sending'}
      >
        {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
      </Button>
      {resendState === 'sending' && (
        <p className="mt-2 text-center text-xs text-ink-muted">
          This can take up to a minute — please don&apos;t refresh.
        </p>
      )}
    </div>
  );

  // ── Waiting for the router to tell us which mode we're in ──────
  if (!router.isReady) {
    return (
      <AuthLayout pageTitle="Verify email" title="Verifying…">
        <div className="flex justify-center py-6">
          <Spinner className="h-6 w-6" label="Loading" />
        </div>
      </AuthLayout>
    );
  }

  // ── Token mode ─────────────────────────────────────────────────
  if (token) {
    if (tokenState === 'verifying') {
      return (
        <AuthLayout
          pageTitle="Verify email"
          title="Verifying your email"
          subtitle="One moment — confirming your link."
        >
          <div className="flex justify-center py-6">
            <Spinner className="h-6 w-6" label="Verifying" />
          </div>
        </AuthLayout>
      );
    }

    return (
      <AuthLayout
        pageTitle="Link expired"
        title="This link has expired"
        subtitle="Verification links are valid for 24 hours."
        footer={backToSignIn}
      >
        <Alert tone="danger">{message}</Alert>
        {resendState === 'sent' ? (
          <Alert tone="success" className="mt-5">
            A fresh verification email is on its way.
          </Alert>
        ) : (
          resendBlock
        )}
      </AuthLayout>
    );
  }

  // ── Post-signup inbox mode ─────────────────────────────────────
  return (
    <AuthLayout
      pageTitle="Verify your email"
      title="Check your email"
      subtitle={
        email
          ? `We sent a verification link to ${email}.`
          : 'We sent you a verification link.'
      }
      footer={backToSignIn}
    >
      {resendState === 'sent' ? (
        <Alert tone="success" title="Email resent">
          Check your inbox — and your spam folder, just in case.
        </Alert>
      ) : (
        <>
          {resendState === 'error' ? (
            <Alert tone="danger">{message}</Alert>
          ) : (
            <Alert tone="info">
              {isNew
                ? 'Click the link in the email to activate your account. It expires in 24 hours.'
                : 'Click the link in the email to verify your address before signing in.'}
            </Alert>
          )}
          {resendBlock}
        </>
      )}
    </AuthLayout>
  );
}
