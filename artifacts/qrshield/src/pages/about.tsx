import { useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, Fingerprint, KeyRound, RefreshCw, ScanLine, ShieldCheck } from 'lucide-react';
import { getHealthCheckQueryKey, useHealthCheck } from '@workspace/api-client-react';
import { Alert, PageTitle } from '@/components/common';

export default function AboutPage() {
  const queryClient = useQueryClient();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  return (
    <>
      <PageTitle eyebrow="About QRShield" title="A classroom lab for payload integrity." description="A safe, hands-on way to see how HMAC signing can help detect unauthorized changes to payment QR payloads—and where that protection ends." />
      <div className="inline-alert warning" style={{ marginBottom: 17 }}><AlertTriangle size={15} /><span><strong>Fictional data only.</strong> QRShield is an academic demonstration. It does not process payments, initiate transfers, connect to banks, or connect to UPI.</span></div>
      <div className="split-grid" style={{ marginTop: 0 }}>
        <section className="panel panel-pad">
          <div className="panel-header"><div><h2 className="section-title">What the lab demonstrates</h2><p className="section-copy">A focused model of signing, tampering, and integrity verification.</p></div><span className="tag">SAFE SANDBOX</span></div>
          <div className="steps">
            <div className="step"><span className="step-number"><ScanLine size={14} /></span><div><h3>1 · Create a fictional payload</h3><p>Students submit a merchant name, identifier, amount, reference, and optional note. The API returns a canonical payload, a signature, and QR text.</p></div></div>
            <div className="step"><span className="step-number"><KeyRound size={14} /></span><div><h3>2 · Sign with HMAC-SHA256</h3><p>The backend creates a keyed message authentication code over the payload. The signing key stays on the server and is never sent to the browser.</p></div></div>
            <div className="step"><span className="step-number"><Activity size={14} /></span><div><h3>3 · Simulate payload manipulation</h3><p>The lab can replace a recipient, alter the amount, or change both—while retaining the original supplied signature for the verification exercise.</p></div></div>
            <div className="step"><span className="step-number"><ShieldCheck size={14} /></span><div><h3>4 · Verify at the API</h3><p>The backend recomputes the expected digest and responds with integrity status, changed fields, and expected and supplied signatures.</p></div></div>
          </div>
        </section>
        <section className="panel panel-pad">
          <div className="panel-header"><div><h2 className="section-title">Threat model</h2><p className="section-copy">What the simple demonstration is designed to make visible.</p></div></div>
          <div className="payload-card">
            <div className="payload-row"><span className="payload-key">Threat</span><span className="payload-value">An untrusted party changes QR payload fields</span></div>
            <div className="payload-row"><span className="payload-key">Example changes</span><span className="payload-value">Recipient identity and/or amount</span></div>
            <div className="payload-row"><span className="payload-key">Defense shown</span><span className="payload-value">Server-side HMAC-SHA256 verification</span></div>
            <div className="payload-row"><span className="payload-key">Trust boundary</span><span className="payload-value">Signing key and verification remain on backend</span></div>
          </div>
          <hr className="divider" />
          <h3 className="section-title" style={{ marginBottom: 9 }}>Security limitations</h3>
          <p className="section-copy" style={{ fontSize: 11, lineHeight: 1.8 }}>A valid signature only shows that the verified data matches the signed data under the server's key. This demo is not a payment system, a complete production threat model, or a substitute for secure key management, authenticated transaction workflows, replay protection, user confirmation, and independent security review.</p>
          <div className="footer-note">Never use QRShield's generated data to make or request a real payment.</div>
        </section>
      </div>
      <section className="panel panel-pad" style={{ marginTop: 16 }}>
        <div className="panel-header"><div><h2 className="section-title">How integrity verification works</h2><p className="section-copy">Canonical fields are signed once; later edits are checked against the original signature.</p></div></div>
        <div className="flow-row" aria-label="Original payment data through HMAC verification">
          {['Original payment data', 'Canonical serialization', 'HMAC signature', 'QR payload', 'Verification', 'Pass or fail'].map((label, index) => (
            <div className="flow-step" key={label}><span className="flow-index">0{index + 1}</span><strong>{label}</strong>{index < 5 && <span className="flow-arrow" aria-hidden="true">→</span>}</div>
          ))}
        </div>
        <div className="tamper-flow"><span>Modified payment data + original signature</span><span aria-hidden="true">→</span><span>Recomputed HMAC mismatch</span><span aria-hidden="true">→</span><strong>Tampering detected</strong></div>
        <p className="footer-note">HMAC requires the signer and verifier to share a trusted secret. A valid HMAC does not independently establish merchant identity.</p>
      </section>
      <section className="panel panel-pad" style={{ marginTop: 16 }}>
        <div className="panel-header"><div><h2 className="section-title">Service health</h2><p className="section-copy">Connectivity status from the health-check API.</p></div><button className="btn btn-secondary btn-sm" onClick={() => void queryClient.invalidateQueries({ queryKey: getHealthCheckQueryKey() })} disabled={health.isFetching} data-testid="button-refresh-health"><RefreshCw size={13} />{health.isFetching ? 'Checking…' : 'Refresh'}</button></div>
        {health.isLoading ? <div className="event-row"><span className="event-icon"><Activity size={13} /></span><div><div className="event-title">Checking API service</div><div className="event-detail">Waiting for a health response.</div></div></div> : health.isError ? <Alert tone="error">Health check did not respond. The lab may not be available yet.</Alert> : <Alert tone="success">Health endpoint responded with status: <span className="mono">{health.data?.status}</span>.</Alert>}
      </section>
    </>
  );
}
