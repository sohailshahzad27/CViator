// frontend/pages/signup-pending.js
// Shown after a staff/admin signup: the request awaits root-admin approval.
// When SMTP isn't configured the approval link is surfaced directly so a
// local deployment can still be walked through end to end.

import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthLayout from '../components/AuthLayout';
import { Alert } from '../components/ui';

export default function SignupPendingPage() {
  const router = useRouter();
  const { email, devLink } = router.query;

  return (
    <AuthLayout
      pageTitle="Awaiting approval"
      title="Request submitted"
      subtitle={
        email
          ? `Your staff access request for ${email} is with the root administrator.`
          : 'Your staff access request is with the root administrator.'
      }
      footer={
        <p className="text-sm text-ink-muted">
          <Link href="/login" className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ol className="space-y-4">
        {[
          { done: true, title: 'Account created', body: 'Your details are saved and your email is on record.' },
          { done: false, title: 'Awaiting review', body: 'The root administrator has been emailed to approve your access.' },
          { done: false, title: 'Sign in', body: 'You’ll get a confirmation email once approved — then you can sign in.' },
        ].map((step, i) => (
          <li key={step.title} className="flex gap-3.5">
            <span
              aria-hidden
              className={
                step.done
                  ? 'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white'
                  : 'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-[11px] font-semibold text-ink-muted'
              }
            >
              {step.done ? '✓' : i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {devLink && (
        <Alert tone="warning" title="Development mode" className="mt-6">
          <p>SMTP isn&apos;t configured, so no email was sent. The root admin can approve at:</p>
          <a href={devLink} className="mt-2 block break-all font-medium underline underline-offset-2">
            {devLink}
          </a>
        </Alert>
      )}
    </AuthLayout>
  );
}
