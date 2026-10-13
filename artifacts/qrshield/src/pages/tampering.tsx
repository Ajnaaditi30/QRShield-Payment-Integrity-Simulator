import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowRightLeft, RotateCcw, ShieldAlert, ShieldCheck, WandSparkles } from 'lucide-react';
import { getGetHistoryQueryKey, getGetStatsQueryKey, useSimulateTampering, useVerifyQr, type PaymentPayload, type TamperInput } from '@workspace/api-client-react';
import { Alert, PageTitle, ResultPanel } from '@/components/common';
import { useAppState } from '@/lib/app-state';

const payloadFields: { key: keyof PaymentPayload; label: string }[] = [
  { key: 'merchant_name', label: 'merchant_name' },
  { key: 'merchant_id', label: 'merchant_id' },
  { key: 'amount', label: 'amount' },
  { key: 'transaction_reference', label: 'transaction_reference' },
  { key: 'payment_note', label: 'payment_note' },
];

function PayloadJson({
  payload,
  changedFields = [],
}: {
  payload: PaymentPayload;
  changedFields?: string[];
}) {
  return (
    <div className="json-viewer" data-testid="data-json-payload">
      <span className="json-brace">{'{'}</span>
      {payloadFields.map(({ key, label }, index) => {
        const value = payload[key];
        const changed = changedFields.includes(key);
        return (
          <div className={`json-line ${changed ? 'changed' : ''}`} key={key}>
            <span className="json-key">"{label}"</span>
            <span className="json-punctuation">: </span>
            <code className={changed ? 'json-changed' : 'json-value'}>
              {JSON.stringify(value)}
            </code>
            {index < payloadFields.length - 1 && <span className="json-punctuation">,</span>}
          </div>
        );
      })}
      <span className="json-brace">{'}'}</span>
    </div>
  );
}

export default function TamperingPage() {
  const { generated, modified, setModified } = useAppState();
  const [attackType, setAttackType] = useState<TamperInput['attack_type']>('recipient');
  const [merchantName, setMerchantName] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();
  const tamper = useSimulateTampering();
  const verify = useVerifyQr();
  const currentPayload = modified?.payload ?? generated?.payload;
  const requiredReplacementMissing = (attackType === 'recipient' || attackType === 'multiple') && (!merchantName.trim() || !merchantId.trim()) || (attackType === 'amount' || attackType === 'multiple') && !(Number(amount) > 0);

  const invalidateActivity = () => {
    void queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
  };
  const submitSimulation = (
    type: TamperInput['attack_type'],
    replacementName?: string,
    replacementId?: string,
    replacementAmount?: number,
  ) => {
    if (!generated) return;
    tamper.mutate({
      data: {
        payload: generated.payload,
        signature: generated.signature,
        attack_type: type,
        ...(replacementName ? { replacement_merchant_name: replacementName } : {}),
        ...(replacementId ? { replacement_merchant_id: replacementId } : {}),
        ...(replacementAmount ? { replacement_amount: replacementAmount } : {}),
      },
    }, {
      onSuccess: (result) => {
        setModified(result);
        verify.reset();
        invalidateActivity();
      },
    });
  };
  const simulate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!generated || requiredReplacementMissing) return;
    submitSimulation(
      attackType,
      attackType === 'recipient' || attackType === 'multiple' ? merchantName.trim() : undefined,
      attackType === 'recipient' || attackType === 'multiple' ? merchantId.trim() : undefined,
      attackType === 'amount' || attackType === 'multiple' ? Number(amount) : undefined,
    );
  };
  const runPreset = (type: TamperInput['attack_type']) => {
    setAttackType(type);
    if (type === 'recipient') {
      setMerchantName('Unknown Recipient');
      setMerchantId('UNKNOWN_999');
      submitSimulation(type, 'Unknown Recipient', 'UNKNOWN_999');
    } else if (type === 'amount') {
      setAmount('950');
      submitSimulation(type, undefined, undefined, 950);
    } else {
      setMerchantName('Unknown Recipient');
      setMerchantId('UNKNOWN_999');
      setAmount('950');
      submitSimulation(type, 'Unknown Recipient', 'UNKNOWN_999', 950);
    }
  };
  const verifyCurrent = () => {
    if (!generated || !currentPayload) return;
    verify.mutate({ data: { payload: currentPayload, signature: modified?.signature ?? generated.signature, original_payload: generated.payload } }, { onSuccess: invalidateActivity });
  };
  const restore = () => {
    setModified(null);
    tamper.reset();
    verify.reset();
  };

  return (
    <>
      <PageTitle eyebrow="Controlled attack simulation" title="Change the payload. Keep the signature." description="Model common QR substitution attacks by changing recipient details, amount, or both. The original signature is preserved so the backend can evaluate the modified data." />
      {!generated ? <section className="panel"><div className="empty-state"><span className="empty-icon"><ShieldAlert size={18} /></span><strong>No original payload available</strong><p>Generate a fictional QR payload first. Its original contents and signature remain available as you move between lab pages.</p><Link className="btn btn-sm" href="/generate" data-testid="link-generate-before-tamper">Open generator</Link></div></section> : <>
        <div className="inline-alert warning" style={{ marginBottom: 16 }}><ShieldAlert size={15} /><span>Simulation only: this changes fictional payload data in the lab. It does not redirect, charge, or communicate with any payment network.</span></div>
        <div className="split-grid" style={{ marginTop: 0 }}>
          <section className="panel panel-pad">
            <div className="panel-header"><div><h2 className="section-title">Attack parameters</h2><p className="section-copy">These edits are submitted to the tampering simulation API.</p></div><span className="tag"><WandSparkles size={11} /> SIMULATED</span></div>
            {tamper.isError && <div style={{ marginBottom: 14 }}><Alert tone="error">{tamper.error instanceof Error ? tamper.error.message : 'Tampering simulation failed. Retry when the API is available.'}</Alert></div>}
            <div className="preset-actions" aria-label="Quick tampering simulations">
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => runPreset('recipient')} disabled={tamper.isPending} data-testid="button-change-recipient">Change Recipient</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => runPreset('amount')} disabled={tamper.isPending} data-testid="button-change-amount">Change Amount</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => runPreset('multiple')} disabled={tamper.isPending} data-testid="button-modify-multiple">Modify Multiple Fields</button>
            </div>
            <form onSubmit={simulate}>
              <div className="field"><label htmlFor="attack-type">Attack pattern</label><select id="attack-type" className="control" value={attackType} onChange={(event) => setAttackType(event.target.value as TamperInput['attack_type'])} data-testid="select-attack-type"><option value="recipient">Recipient substitution</option><option value="amount">Amount manipulation</option><option value="multiple">Recipient + amount</option></select><span className="field-hint">Choose which fields the simulator will replace while preserving the original signature.</span></div>
              {(attackType === 'recipient' || attackType === 'multiple') && <div className="form-grid" style={{ marginTop: 15 }}>
                <div className="field"><label htmlFor="replacement-merchant">Replacement merchant</label><input id="replacement-merchant" className="control" value={merchantName} maxLength={80} onChange={(event) => setMerchantName(event.target.value)} placeholder="Enter a changed recipient" required data-testid="input-replacement-merchant" /></div>
                <div className="field"><label htmlFor="replacement-id">Replacement merchant ID</label><input id="replacement-id" className="control" value={merchantId} maxLength={40} onChange={(event) => setMerchantId(event.target.value)} placeholder="Enter a changed ID" required data-testid="input-replacement-merchant-id" /></div>
              </div>}
              {(attackType === 'amount' || attackType === 'multiple') && <div className="field" style={{ marginTop: 15 }}><label htmlFor="replacement-amount">Replacement amount (INR)</label><input id="replacement-amount" className="control" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter a changed amount" required data-testid="input-replacement-amount" /></div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                <button className="btn" type="submit" disabled={tamper.isPending || requiredReplacementMissing} data-testid="button-simulate-tampering">{tamper.isPending ? 'Simulating…' : <><ArrowRightLeft size={14} /> Simulate tampering</>}</button>
                <button className="btn btn-secondary" type="button" onClick={restore} disabled={!modified && !verify.data} data-testid="button-restore-original"><RotateCcw size={13} /> Restore Original</button>
              </div>
            </form>
            <hr className="divider" />
            <div className="payload-key" style={{ marginBottom: 6 }}>Signature retained during the edit</div>
            <div className="signature" data-testid="text-original-signature">{generated.signature}</div>
          </section>
          <section className="panel panel-pad">
            <div className="panel-header"><div><h2 className="section-title">Original vs modified</h2><p className="section-copy">Modified fields are reported by the API response.</p></div></div>
            <div className="compare-grid">
              <div><div className="compare-title"><span className="tag">ORIGINAL PAYLOAD</span></div><PayloadJson payload={generated.payload} /></div>
              <div><div className="compare-title"><span className="tag" style={{ color: modified ? '#ff9da5' : undefined }}>{modified ? 'TAMPERING SIMULATED' : 'MODIFIED PAYLOAD'}</span></div>{modified ? <PayloadJson payload={modified.payload} changedFields={modified.changed_fields} /> : <div className="payload-card" style={{ minHeight: 180, display: 'grid', placeItems: 'center', color: '#7783a0', textAlign: 'center', fontSize: 10 }}>Run the simulator to receive the modified payload from the API.</div>}</div>
            </div>
            {modified && <div style={{ marginTop: 14 }}><span className="payload-key">Changed fields </span><span className="tag" data-testid="text-changed-fields">{modified.changed_fields.length ? modified.changed_fields.join(', ') : 'No fields reported'}</span></div>}
            {modified && <div className="difference-summary" data-testid="data-difference-summary">
              <div><span>Original merchant</span><strong>{generated.payload.merchant_name} · {generated.payload.merchant_id}</strong></div>
              <div><span>Modified merchant</span><strong className={modified.changed_fields.includes('merchant_id') ? 'text-threat' : ''}>{modified.payload.merchant_name} · {modified.payload.merchant_id}</strong></div>
              <div><span>Original amount</span><strong>₹{generated.payload.amount}</strong></div>
              <div><span>Modified amount</span><strong className={modified.changed_fields.includes('amount') ? 'text-threat' : ''}>₹{modified.payload.amount}</strong></div>
            </div>}
            <div style={{ display: 'flex', gap: 9, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={verifyCurrent} disabled={!generated || verify.isPending} data-testid="button-verify-modified">{verify.isPending ? 'Checking…' : <><ShieldCheck size={14} /> {modified ? 'Verify Modified QR' : 'Verify Original QR'}</>}</button>
              <Link className="btn btn-quiet" href="/verification" data-testid="link-verification-console">Open verification console <ArrowRightLeft size={12} /></Link>
            </div>
            {verify.isError && <div style={{ marginTop: 13 }}><Alert tone="error">{verify.error instanceof Error ? verify.error.message : 'Backend verification could not be completed.'}</Alert></div>}
            {verify.data && <div style={{ marginTop: 15 }}><ResultPanel result={verify.data} /></div>}
          </section>
        </div>
        <div className="inline-alert" style={{ marginTop: 16 }}><ShieldAlert size={15} /><span>The simulated attacker changes payment information but does not know the signing secret. The original signature no longer matches the modified payload, so verification fails. This is a controlled educational simulation, not a real payment interception tool.</span></div>
      </>}
    </>
  );
}
