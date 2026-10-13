import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowDownWideNarrow, ArrowUpWideNarrow, Clock3, RefreshCw, Search, Trash2 } from 'lucide-react';
import { getGetHistoryQueryKey, getGetStatsQueryKey, useClearHistory, useGetHistory, type ActivityEvent } from '@workspace/api-client-react';
import { Alert, EmptyState, EventLabel, LoadingState, PageTitle } from '@/components/common';

type EventFilter = 'ALL' | ActivityEvent['event_type'];
type ResultFilter = 'ALL' | ActivityEvent['result'];
export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventFilter>('ALL');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('ALL');
  const [sortNewest, setSortNewest] = useState(true);
  const history = useGetHistory();
  const clearMutation = useClearHistory();
  const queryClient = useQueryClient();
  const events = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...(history.data?.events ?? [])]
      .filter((event) => filter === 'ALL' || event.event_type === filter)
      .filter((event) => resultFilter === 'ALL' || event.result === resultFilter)
      .filter((event) => !needle || [event.description, event.transaction_reference, event.event_type, event.result].some((value) => value.toLowerCase().includes(needle)))
      .sort((a, b) => (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * (sortNewest ? -1 : 1));
  }, [history.data?.events, search, filter, resultFilter, sortNewest]);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
  };
  const clear = () => {
    if (!window.confirm('Clear all temporary event history for this service process? This may affect other visitors sharing it.')) return;
    clearMutation.mutate(undefined, { onSuccess: refresh });
  };
  const options: { value: EventFilter; label: string }[] = [
    { value: 'ALL', label: 'All event types' },
    { value: 'QR_GENERATED', label: 'QR generated' },
    { value: 'TAMPERING_SIMULATED', label: 'Tampering simulated' },
    { value: 'INTEGRITY_VERIFIED', label: 'Integrity verified' },
    { value: 'TAMPERING_DETECTED', label: 'Tampering detected' },
    { value: 'VERIFICATION_FAILED', label: 'Verification failed' },
  ];
  return (
    <>
      <PageTitle eyebrow="Temporary event store" title="History of the lab session." description="Search and inspect events recorded by the API process. History is temporary and may be shared by visitors using the same backend process." action={<button className="btn btn-danger" onClick={clear} disabled={!history.data?.events.length || clearMutation.isPending} data-testid="button-clear-history"><Trash2 size={14} />{clearMutation.isPending ? 'Clearing…' : 'Clear history'}</button>} />
      {history.data?.temporary && <div className="inline-alert warning" style={{ marginBottom: 16 }}><Clock3 size={15} /><span>This event history is temporary and may be shared by other visitors on this process. Clearing it affects the shared history.</span></div>}
      {clearMutation.isError && <div style={{ marginBottom: 14 }}><Alert tone="error">History could not be cleared. {clearMutation.error instanceof Error ? clearMutation.error.message : 'Try again.'}<button className="btn btn-sm btn-secondary" onClick={clear} data-testid="button-retry-clear-history">Retry</button></Alert></div>}
      {history.isError && <div style={{ marginBottom: 14 }}><Alert tone="error">The API did not return event history. <button className="btn btn-sm btn-secondary" onClick={refresh} data-testid="button-retry-history-page">Retry</button></Alert></div>}
      <section className="panel panel-pad">
        <div className="panel-header"><div><h2 className="section-title">Recorded events</h2><p className="section-copy" data-testid="text-history-count">{history.data ? `${events.length} shown of ${history.data.events.length} events` : 'Events reported by backend'}</p></div><div className="history-header-actions"><span className="tag">{history.data?.temporary ? 'TEMPORARY' : 'API HISTORY'}</span><button className="btn btn-secondary btn-sm" onClick={refresh} disabled={history.isFetching} data-testid="button-refresh-history"><RefreshCw size={13} />{history.isFetching ? 'Refreshing…' : 'Refresh history'}</button></div></div>
        <div className="history-controls">
          <div style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', left: 11, top: 11, color: '#75809e' }} /><input aria-label="Search history" className="control" style={{ paddingLeft: 34 }} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search references or event details" data-testid="input-history-search" /></div>
          <select className="control" aria-label="Filter event type" value={filter} onChange={(event) => setFilter(event.target.value as EventFilter)} data-testid="select-history-filter">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <select className="control" aria-label="Filter result" value={resultFilter} onChange={(event) => setResultFilter(event.target.value as ResultFilter)} data-testid="select-history-result-filter">
            <option value="ALL">All results</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="FAILED">Failed</option>
          </select>
          <button className="btn btn-secondary" onClick={() => setSortNewest((value) => !value)} aria-label={sortNewest ? 'Sort oldest first' : 'Sort newest first'} data-testid="button-history-sort">{sortNewest ? <ArrowDownWideNarrow size={14} /> : <ArrowUpWideNarrow size={14} />}{sortNewest ? 'Newest' : 'Oldest'}</button>
        </div>
        {history.isLoading ? <LoadingState label="Loading event history…" /> : !history.isError && !events.length ? <EmptyState icon={Activity} title={history.data?.events.length ? 'No matching events' : 'No activity recorded'} description={history.data?.events.length ? 'Adjust your search or event filter to see other records.' : 'Events will appear here after payload generation, tampering simulation, or backend verification.'} /> : !history.isError && <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Event</th><th>Reference</th><th>Event type</th><th>Result</th><th>Timestamp</th></tr></thead>
            <tbody>{events.map((event) => <tr key={event.id} data-testid={`row-history-${event.id}`}>
              <td><div className="activity-name"><EventLabel event={event} /></div><div className="activity-desc">{event.description}</div></td>
              <td className="mono">{event.transaction_reference}</td>
              <td className="mono">{event.event_type}</td>
              <td><span className={`tag ${event.result === 'FAILED' ? 'warning' : ''}`}>{event.result}</span></td>
              <td className="mono">{new Date(event.timestamp).toLocaleString()}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
      <p className="footer-note">Session history is temporary. No database is used. This page reflects the API process and does not store durable records in the browser.</p>
    </>
  );
}
