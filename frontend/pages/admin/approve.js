// frontend/pages/admin/approve.js
// Public page reached from the root admin's approval email.
// Calls GET /api/admin/approve/:token — the token is consumed atomically
// server-side, so refreshing this page will (correctly) report it as used.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { approveAdminByToken } from '../../services/auth';
import AuthLayout from '../../components/AuthLayout';
import { Alert, Button, Spinner } from '../../components/ui';

export default function AdminApprovePage() {
  const router = useRouter();
  const { token } = router.query;

  const [state, setState] = useState('working'); // working | done | error | missing
  const [message, setMessage] = useState('');
  const [approvedEmail, setApprovedEmail] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setState('missing');
      return;
    }
    setState('working');
    approveAdminByToken(token)
      .then((r) => {
        setState('done');
        setApprovedEmail(r?.email || '');
      })
      .catch((err) => {
        setState('error');
        setMessage(err.message || 'This approval link is invalid or has expired.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, token]);

  const titles = {
    working: 'Approving access…',
    done: 'Access approved',
    error: 'Link no longer valid',
    missing: 'Nothing to approve',
  };

  return (
    <AuthLayout
      pageTitle="Approve staff access"
      title={titles[state]}
      subtitle={
        state === 'working'
          ? 'Confirming the approval link.'
          : state === 'done'
          ? 'The account can now sign in to the dashboard.'
          : undefined
      }
      footer={
        <p className="text-sm text-ink-muted">
          <Link href="/admin" className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
            Go to the dashboard
          </Link>
        </p>
      }
    >
      {state === 'working' && (
        <div className="flex justify-center py-6">
          <Spinner className="h-6 w-6" label="Approving" />
        </div>
      )}

      {state === 'done' && (
        <Alert tone="success" title="Approved">
          {approvedEmail ? (
            <>
              <span className="font-medium">{approvedEmail}</span> now has staff access and can
              sign in.
            </>
          ) : (
            'The requester now has staff access and can sign in.'
          )}
        </Alert>
      )}

      {state === 'error' && (
        <>
          <Alert tone="danger">{message}</Alert>
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Approval links are single-use and expire after 48 hours. If this one was already used,
            the account may already be active — check the pending requests panel on the dashboard.
          </p>
        </>
      )}

      {state === 'missing' && (
        <>
          <Alert tone="info">
            This page needs an approval token from the email the root administrator received.
          </Alert>
          <div className="mt-5">
            <Button variant="secondary" size="lg" className="w-full" onClick={() => router.push('/admin')}>
              Open the dashboard instead
            </Button>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
