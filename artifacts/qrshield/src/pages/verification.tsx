import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Fingerprint, RotateCcw, ShieldCheck } from 'lucide-react';
import { getGetHistoryQueryKey, getGetStatsQueryKey, useVerifyQr } from '@workspace/api-client-react';
import { Alert, PageTitle, PayloadDetails, ResultPanel } from '@/components/common';
import { useAppState } from '@/lib/app-state';

export default function VerificationPage() {
  const { generated, modified } = useAppState();
  const queryClient = useQueryClient();
  const verify = useVerifyQr();
  const payload = modified?.payload ?? generated?.payload;
  const signature = modified?.signature ?? generated?.signature;
  const check = () => {
    if (!payload || !signature) return;
    verify.mutate({ data: { payload, signature, original_payload: generated?.payload ?? null } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
    });
  };
  return (
    <>
      <PageTitle eyebrow="HMAC-SHA256 verification" title="Ask the backend to verify integrity." description="QRShield never decides validity in the browser. This console sends the current payload and its supplied signature to the verification API, then displays the returned result." />
      {!generated ? <section className="panel"><div className="empty-state"><span className="empty-icon"><Fingerprint size={18} /></span><strong>Nothing to verify yet</strong><p>Generate a payload to begin. The verification result is provided by the backend only.</p><Link className="btn btn-sm" href="/generate" data-testid="link-generate-for-verification">Generate a fictional QR</Link></div></section> : <>
        <div className="split-grid" style={{ marginTop: 0 }}>
          <section className="panel panel-pad">
            <div className="panel-header"><div><h2 className="section-title">Current signed payload</h2><p className="section-copy">The modified payload uses the original, unchanged signature.</p></div><span className="tag">{modified ? 'MODIFIED' : 'ORIGINAL'}</span></div>
            <PayloadDetails payload={payload!} />
            <div style={{ marginTop: 15 }}><div className="payload-key" style={{ marginBottom: 6 }}>Supplied signature</div><div className="signature" data-testid="text-current-signature">{signature}</div></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 17, flexWrap: 'wrap' }}>
              <button className="btn" onClick={check} disabled={verify.isPending} data-testid="button-run-verification">{verify.isPending ? 'Verifying…' : <><ShieldCheck size={14} /> Verify Current Payload</>}</button>
              <button className="btn btn-quiet" onClick={() => verify.reset()} disabled={!verify.data && !verify.error} data-testid="button-clear-verification"><RotateCcw size={13} /> Clear result</button>
            </div>
            {verify.isError && <div style={{ marginTop: 14 }}><Alert tone="error">{verify.error instanceof Error ? verify.error.message : 'Verification request failed. Retry when the API is reachable.'}</Alert></div>}
          </section>
          <section className="panel panel-pad">
            <div className="panel-header"><div><h2 className="section-title">Verification response</h2><p className="section-copy">Only the backend response is authoritative for this demo.</p></div></div>
            {verify.isPending ? <div className="empty-state"><span className="empty-icon"><Fingerprint size={18} /></span><strong>Checking signature…</strong><p>HMAC-SHA256 verification is in progress on the backend.</p></div> : verify.data ? <ResultPanel result={verify.data} /> : <div className="empty-state"><span className="empty-icon"><ShieldCheck size={18} /></span><strong>Awaiting a backend check</strong><p>Run verification to see the returned status, changed fields, and signature digests.</p></div>}
            <div className="footer-note">Expected signatures shown by the API are calculated digests only. The signing key is never exposed to the client.</div>
          </section>
        </div>
        <div className="panel panel-pad" style={{ marginTop: 16 }}>
          <div className="panel-header" style={{ marginBottom: 0 }}><div><h2 className="section-title">Next step</h2><p className="section-copy">Compare the untouched and edited payloads before checking the response.</p></div><Link href="/tampering" className="btn btn-secondary btn-sm" data-testid="link-open-tampering-from-verify">Open tampering lab</Link></div>
        </div>
      </>}
    </>
  );
}
