import { AlertCircle, CheckCircle2, LoaderCircle, type LucideIcon } from 'lucide-react';
import type { ActivityEvent, PaymentPayload, VerificationResult } from '@workspace/api-client-react';
import type { ReactNode } from 'react';

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="page-subtitle">{description}</p></div>
      {action ? <div className="page-heading-actions">{action}</div> : null}
    </div>
  );
}

export function Alert({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'error' | 'success' }) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`inline-alert ${tone === 'info' ? '' : tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon size={15} /> <span>{children}</span></div>;
}

export function LoadingState({ label = 'Loading activity…' }: { label?: string }) {
  return <div className="empty-state" aria-live="polite"><span className="empty-icon"><LoaderCircle size={19} className="spin" /></span><strong>{label}</strong><p>Waiting for the lab service to respond.</p></div>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={18} /></span><strong>{title}</strong><p>{description}</p>{action ? <div style={{ marginTop: 14 }}>{action}</div> : null}</div>;
}

export function PayloadDetails({ payload }: { payload: PaymentPayload }) {
  const rows = [
    ['Merchant', payload.merchant_name],
    ['Merchant ID', payload.merchant_id],
    ['Amount', `₹${payload.amount}`],
    ['Transaction ref', payload.transaction_reference],
    ['Payment note', payload.payment_note || '—'],
  ];
  return <div className="payload-card" data-testid="data-payload-details">{rows.map(([label, value]) => <div className="payload-row" key={label}><span className="payload-key">{label}</span><span className="payload-value">{value}</span></div>)}</div>;
}

export function ResultPanel({ result }: { result: VerificationResult }) {
  return (
    <section className={`verify-result ${result.valid ? '' : 'invalid'}`} data-testid="status-verification-result">
      <div className="eyebrow" style={{ marginBottom: 8, color: result.valid ? '#8ed8bc' : '#ff9da5' }}>Backend verification · {result.status.replaceAll('_', ' ')}</div>
      <h3>{result.valid ? 'INTEGRITY VERIFIED' : 'TAMPERING DETECTED'}</h3>
      <p>{result.message}</p>
      <hr className="divider" />
      <div className="payload-row"><span className="payload-key">Checked at</span><span className="payload-value mono">{new Date(result.checked_at).toLocaleString()}</span></div>
      <div className="payload-row"><span className="payload-key">Changed fields</span><span className="payload-value">{result.changed_fields.length ? result.changed_fields.join(', ') : 'None reported'}</span></div>
      <div style={{ marginTop: 12 }}><div className="payload-key" style={{ marginBottom: 5 }}>Expected signature</div><div className="signature" data-testid="text-expected-signature">{result.expected_signature}</div></div>
      <div style={{ marginTop: 9 }}><div className="payload-key" style={{ marginBottom: 5 }}>Supplied signature</div><div className="signature" data-testid="text-supplied-signature">{result.supplied_signature}</div></div>
    </section>
  );
}

export function EventLabel({ event }: { event: ActivityEvent }) {
  const labels: Record<ActivityEvent['event_type'], string> = {
    QR_GENERATED: 'QR payload generated',
    TAMPERING_SIMULATED: 'Tampering simulated',
    INTEGRITY_VERIFIED: 'Integrity verified',
    TAMPERING_DETECTED: 'Tampering detected',
    VERIFICATION_FAILED: 'Verification failed',
  };
  return <>{labels[event.event_type]}</>;
}
