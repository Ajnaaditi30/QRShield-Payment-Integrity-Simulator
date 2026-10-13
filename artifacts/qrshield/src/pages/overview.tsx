import { Link } from 'wouter';
import { Activity, ArrowUpRight, Fingerprint, History, QrCode, ScanLine, ShieldAlert, ShieldCheck } from 'lucide-react';
import { getGetHistoryQueryKey, getGetStatsQueryKey, useGetHistory, useGetStats } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, EmptyState, EventLabel, LoadingState, PageTitle } from '@/components/common';

export default function OverviewPage() {
  const queryClient = useQueryClient();
  const stats = useGetStats();
  const history = useGetHistory();
  const metricList = [
    { label: 'QR Codes Generated', value: stats.data?.qr_codes_generated, icon: QrCode, hint: 'Session activity' },
    { label: 'Tampering Attempts', value: stats.data?.tampering_attempts, icon: ShieldAlert, hint: 'Controlled edits' },
    { label: 'Integrity Checks', value: stats.data?.integrity_checks, icon: Fingerprint, hint: 'Backend HMAC checks' },
    { label: 'Tampering detected', value: stats.data?.tampering_detected, icon: ShieldCheck, hint: 'Backend findings' },
  ];
  const retry = () => {
    void queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
  };

  return (
    <>
      <PageTitle
        eyebrow="Integrity workbench"
        title="Scan smart. Trust nothing blindly."
        description="Simulate QR payment tampering, inspect payload changes, and verify message integrity in a safe environment."
        action={
          <div className="page-heading-actions">
            <Link className="btn" href="/generate" data-testid="button-create-payload"><QrCode size={15} /> Generate QR <ArrowUpRight size={14} /></Link>
            <Link className="btn btn-secondary" href="/tampering" data-testid="button-open-tampering">Open Tampering Lab <ArrowUpRight size={14} /></Link>
          </div>
        }
      />
      <div className="inline-alert warning" style={{ marginBottom: 18 }}><ShieldAlert size={15} /><span><strong>Academic sandbox only.</strong> QRShield creates fictional payment data. It does not process payments or connect to banking or UPI networks.</span></div>
      {(stats.isError || history.isError) && <div style={{ marginBottom: 16 }}><Alert tone="error">Could not load live lab activity. <button className="btn btn-sm btn-secondary" onClick={retry} data-testid="button-retry-overview">Retry</button></Alert></div>}
      <div className="metric-grid">
        {metricList.map(({ label, value, icon: Icon, hint }) => (
          <article className="panel metric-card" key={label} data-testid={`card-metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
            <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={14} /></span></div>
            <div className="metric-value" data-testid={`text-metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{stats.isLoading ? '—' : value ?? '—'}</div>
            <div className="metric-caption">{hint}{stats.isLoading ? ' · Loading' : ''}</div>
          </article>
        ))}
      </div>
      <div className="split-grid">
        <section className="panel panel-pad">
          <div className="panel-header"><div><h2 className="section-title">Recent activity</h2><p className="section-copy">Events returned by the backend for this process.</p></div><Link className="btn btn-quiet btn-sm" href="/history" data-testid="link-view-history">Full history <ArrowUpRight size={12} /></Link></div>
          {history.isLoading ? <LoadingState label="Loading recent events…" /> : history.isError ? <EmptyState icon={Activity} title="Activity unavailable" description="The service did not return event history. Try again when the API is reachable." action={<button className="btn btn-secondary btn-sm" onClick={retry} data-testid="button-retry-history">Retry history</button>} /> : history.data?.events.length ? history.data.events.slice(0, 5).map((event) => (
            <div className="event-row" key={event.id} data-testid={`row-event-${event.id}`}>
              <span className="event-icon"><Activity size={13} /></span><div><div className="event-title"><EventLabel event={event} /></div><div className="event-detail">{event.description}</div></div><span className="event-meta">{new Date(event.timestamp).toLocaleString()}</span>
            </div>
          )) : <EmptyState icon={History} title="No events yet" description="Generated payloads and backend checks will appear here as you explore the lab." />}
          {history.data?.temporary && <p className="footer-note">Temporary process history. It may be shared with other visitors using the same service process.</p>}
        </section>
        <section className="panel panel-pad">
          <div className="panel-header"><div><h2 className="section-title">Explore the workflow</h2><p className="section-copy">A compact path from creation to verification.</p></div><span className="tag">3 STAGES</span></div>
          <div className="steps">
            <div className="step"><span className="step-number">01</span><div><h3>Generate a signed QR</h3><p>Submit fictional merchant data and receive a real backend-generated payload and HMAC signature.</p><Link href="/generate" className="event-detail" data-testid="link-workflow-generate">Open payload generator →</Link></div></div>
            <div className="step"><span className="step-number">02</span><div><h3>Simulate an untrusted edit</h3><p>Change recipient details or amount while keeping the original signature intact.</p><Link href="/tampering" className="event-detail" data-testid="link-workflow-tampering">Open tampering lab →</Link></div></div>
            <div className="step"><span className="step-number">03</span><div><h3>Verify on the backend</h3><p>The server recalculates HMAC-SHA256 and returns the integrity result.</p><Link href="/verification" className="event-detail" data-testid="link-workflow-verify">Open verification console →</Link></div></div>
          </div>
        </section>
      </div>
      <div style={{ marginTop: 16 }} className="panel panel-pad">
          <div className="panel-header" style={{ marginBottom: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: 13 }}><span className="metric-icon"><ScanLine size={17} /></span><div><h2 className="section-title">Why QR integrity matters</h2><p className="section-copy">A QR code can encode payment information, but the image alone does not prove that data is authentic. If signed payment information changes, a correctly implemented message-authentication check should reject it.</p></div></div><Link href="/about" className="btn btn-secondary btn-sm" data-testid="link-learn-security">About the project</Link></div>
      </div>
    </>
  );
}
