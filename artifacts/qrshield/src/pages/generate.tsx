import { useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Check, Clipboard, Download, RotateCcw, RotateCw, ShieldCheck, Sparkles } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { getGetHistoryQueryKey, getGetStatsQueryKey, useGenerateQr } from '@workspace/api-client-react';
import type { PaymentInput } from '@workspace/api-client-react';
import { Alert, PageTitle, PayloadDetails } from '@/components/common';
import { useAppState } from '@/lib/app-state';

const makeExampleForm = (): PaymentInput => ({
  merchant_name: 'Demo Coffee Store',
  merchant_id: 'MERCHANT_001',
  amount: 150,
  transaction_reference: `QR-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  payment_note: 'Academic demonstration',
});

export default function GeneratePage() {
  const [form, setForm] = useState<PaymentInput>(makeExampleForm);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const { generated, setGenerated, setModified } = useAppState();
  const queryClient = useQueryClient();
  const mutation = useGenerateQr();
  const update = (key: keyof PaymentInput, value: string) => setForm((current) => key === 'amount'
    ? { ...current, amount: value === '' ? 0 : Number(value) }
    : { ...current, [key]: value });
  const generate = () => {
    mutation.mutate({ data: { ...form, amount: Number(form.amount) } }, {
      onSuccess: (result) => {
        setGenerated(result);
        setModified(null);
        void queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
    });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    generate();
  };
  const reset = () => {
    setForm(makeExampleForm());
    setGenerated(null);
    setModified(null);
    mutation.reset();
    setCopied(false);
    setCopyError(false);
    setDownloadError(false);
  };
  const copy = async () => {
    if (!generated) return;
    try {
      setCopyError(false);
      await navigator.clipboard.writeText(generated.qr_text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError(true);
    }
  };
  const download = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas || !generated) {
      setDownloadError(true);
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `${generated.payload.transaction_reference || 'qrshield-payload'}.png`;
    anchor.click();
    setDownloadError(false);
  };
  return (
    <>
      <PageTitle eyebrow="Payload generator" title="Create a fictional payment QR." description="The API creates the canonical payload and signature. QRShield is a classroom integrity simulator—not a payment product." />
      <div className="qr-layout">
        <section className="panel panel-pad">
          <div className="panel-header"><div><h2 className="section-title">Payload details</h2><p className="section-copy">All fields are fictional and stay within this demonstration workflow.</p></div><span className="tag"><Sparkles size={11} /> API SIGNED</span></div>
          {mutation.isError && <div style={{ marginBottom: 15 }}><Alert tone="error">{mutation.error instanceof Error ? mutation.error.message : 'The payload could not be generated. Check the API and try again.'}</Alert></div>}
          <div className="inline-alert" style={{ marginBottom: 15 }}><Sparkles size={14} /><span>Pre-filled values are fictional examples. Edit any field before creating a demonstration QR.</span></div>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="field"><label htmlFor="merchant-name">Merchant name</label><input id="merchant-name" className="control" maxLength={80} required value={form.merchant_name} onChange={(e) => update('merchant_name', e.target.value)} placeholder="e.g. Northstar Bookshop" data-testid="input-merchant-name" /></div>
              <div className="field"><label htmlFor="merchant-id">Merchant ID</label><input id="merchant-id" className="control" maxLength={40} required value={form.merchant_id} onChange={(e) => update('merchant_id', e.target.value)} placeholder="e.g. EDU-MERCH-042" data-testid="input-merchant-id" /></div>
              <div className="field"><label htmlFor="amount">Amount (INR)</label><input id="amount" className="control" type="number" min="0.01" step="0.01" required value={form.amount || ''} onChange={(e) => update('amount', e.target.value)} placeholder="125.00" data-testid="input-amount" /></div>
              <div className="field"><label htmlFor="transaction-reference">Transaction reference</label><input id="transaction-reference" className="control" maxLength={64} required value={form.transaction_reference} onChange={(e) => update('transaction_reference', e.target.value)} placeholder="e.g. CLASS-2025-014" data-testid="input-transaction-reference" /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="payment-note">Payment note <span style={{ color: '#7884a1', fontWeight: 500 }}>optional</span></label><input id="payment-note" className="control" maxLength={120} value={form.payment_note} onChange={(e) => update('payment_note', e.target.value || '')} placeholder="Optional classroom demo note" data-testid="input-payment-note" /></div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 19, flexWrap: 'wrap' }}>
              <button className="btn" type="submit" disabled={mutation.isPending} data-testid="button-generate-qr">{mutation.isPending ? 'Generating…' : <><ShieldCheck size={14} /> Generate Secure Demo QR</>}</button>
              <button className="btn btn-secondary" type="button" onClick={generate} disabled={mutation.isPending || !generated} data-testid="button-regenerate-qr"><RotateCw size={13} /> Generate another QR</button>
              <button className="btn btn-quiet" type="button" onClick={reset} data-testid="button-reset-form"><RotateCcw size={13} /> Reset</button>
            </div>
          </form>
          <div className="footer-note">Only the API response provides the signed payload shown here. Do not scan this QR to make a payment.</div>
        </section>
        <section className="panel panel-pad">
          <div className="panel-header"><div><h2 className="section-title">QR preview</h2><p className="section-copy">A scannable rendering of the returned QR text.</p></div>{generated && <span className="tag">READY</span>}</div>
          {generated ? <>
            <div className="qr-frame" ref={qrRef} data-testid="img-generated-qr"><QRCodeCanvas value={generated.qr_text} size={220} level="M" includeMargin /></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 13 }}>
              <button className="btn btn-secondary btn-sm" onClick={download} data-testid="button-download-qr"><Download size={13} /> Download PNG</button>
              <button className="btn btn-secondary btn-sm" onClick={copy} data-testid="button-copy-qr">{copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? 'Copied payload' : 'Copy payload'}</button>
            </div>
            {copyError && <div style={{ marginTop: 10 }}><Alert tone="error">Clipboard access is unavailable in this browser context. You can still download the QR image.</Alert></div>}
            {downloadError && <div style={{ marginTop: 10 }}><Alert tone="error">The QR image could not be exported as PNG. Try generating it again.</Alert></div>}
            <div className="fictional-label">FICTIONAL PAYMENT DATA — NOT FOR REAL PAYMENTS</div>
            <hr className="divider" />
            <PayloadDetails payload={generated.payload} />
            <div style={{ marginTop: 13 }}><div className="payload-key" style={{ marginBottom: 6 }}>HMAC-SHA256 signature returned by API</div><div className="signature" data-testid="text-generated-signature">{generated.signature}</div></div>
            <div style={{ marginTop: 15 }}><Link className="btn btn-secondary btn-sm" href="/tampering" data-testid="link-open-tampering">Continue to tampering lab <RotateCw size={12} /></Link></div>
          </> : <div className="empty-state" style={{ minHeight: 288 }}><span className="empty-icon"><Download size={18} /></span><strong>No QR payload yet</strong><p>Fill in fictional values and generate a payload to preview the real API response as a QR.</p></div>}
        </section>
      </div>
    </>
  );
}
