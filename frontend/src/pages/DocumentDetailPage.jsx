import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { getUserName } from '../api';

const TYPE_BADGE = { playbook: 'badge-blue', runbook: 'badge-green', brd: 'badge-yellow', sop: 'badge-purple', architecture: 'badge-gray', api: 'badge-blue', other: 'badge-gray' };
const STATUS_BADGE = { SUBMITTED: 'badge-yellow', APPROVED: 'badge-green', REJECTED: 'badge-red', MERGED: 'badge-purple', UNDER_REVIEW: 'badge-blue' };

function ReviewCycleItem({ rc, onAction }) {
  const [approverName, setApproverName] = useState(getUserName());
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const act = async (action) => {
    setLoading(true);
    try {
      if (action === 'approve') await onAction('approve', rc.reviewCycleId, { approverName });
      else if (action === 'reject') await onAction('reject', rc.reviewCycleId, { approverName, reason });
      else if (action === 'merge') await onAction('merge', rc.reviewCycleId, { mergedBy: approverName });
    } finally { setLoading(false); setShowReject(false); }
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 12, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{rc.changeDescription}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            by {rc.requesterName} · {new Date(rc.createdAt).toLocaleString()}
          </div>
        </div>
        <span className={`badge ${STATUS_BADGE[rc.status] || 'badge-gray'}`}>{rc.status}</span>
      </div>

      {rc.proposedContent && rc.proposedContent !== rc.currentContent && (
        <details style={{ marginBottom: 8 }}>
          <summary style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}>View proposed changes</summary>
          <div style={{ marginTop: 8, padding: 12, background: 'var(--bg)', borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
            {rc.proposedContent}
          </div>
        </details>
      )}

      {rc.rejectionReason && (
        <div className="alert alert-error" style={{ marginBottom: 8 }}>
          Rejected: {rc.rejectionReason}
        </div>
      )}

      {(rc.status === 'SUBMITTED' || rc.status === 'UNDER_REVIEW') && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: showReject ? 8 : 0 }}>
            <input className="form-control" placeholder="Your name" value={approverName} onChange={e => setApproverName(e.target.value)} style={{ maxWidth: 150 }} />
            <button onClick={() => act('approve')} disabled={loading} className="btn btn-success btn-sm">Approve</button>
            <button onClick={() => setShowReject(!showReject)} disabled={loading} className="btn btn-danger btn-sm">Reject</button>
          </div>
          {showReject && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-control" placeholder="Rejection reason" value={reason} onChange={e => setReason(e.target.value)} />
              <button onClick={() => act('reject')} disabled={loading || !reason} className="btn btn-danger btn-sm">Submit</button>
            </div>
          )}
        </div>
      )}

      {rc.status === 'APPROVED' && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 8 }}>✓ Approved by {rc.approverName}</div>
          <button onClick={() => act('merge')} disabled={loading} className="btn btn-primary btn-sm">
            {loading ? <><div className="spinner" /> Merging...</> : '⬆ Merge Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [reviewCycles, setReviewCycles] = useState([]);
  const [auditRecords, setAuditRecords] = useState([]);
  const [relationships, setRelationships] = useState({ outgoing: [], incoming: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ changeDescription: '', proposedContent: '', requesterName: getUserName() });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [d, v, rc, a, r] = await Promise.all([
        api.documents.get(id),
        api.documents.versions(id),
        api.documents.reviewCycles(id),
        api.documents.audit(id),
        api.documents.relationships(id),
      ]);
      setDoc(d);
      setVersions(v.versions || []);
      setReviewCycles(rc.reviewCycles || []);
      setAuditRecords(a.auditRecords || []);
      setRelationships({ outgoing: r.outgoing || [], incoming: r.incoming || [] });
      setReviewForm(f => ({ ...f, proposedContent: d.content || '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleReviewAction = async (action, reviewCycleId, data) => {
    try {
      if (action === 'approve') await api.reviewCycles.approve(id, reviewCycleId, data);
      else if (action === 'reject') await api.reviewCycles.reject(id, reviewCycleId, data);
      else if (action === 'merge') await api.reviewCycles.merge(id, reviewCycleId, data);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.documents.createReviewCycle(id, reviewForm);
      setShowReviewForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading document...</span></div>;
  if (!doc) return <div className="alert alert-error">Document not found. <Link to="/documents">Back to list</Link></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to="/documents">Knowledge Base</Link> / {doc.title}
          </div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {doc.title}
            <span className={`badge ${TYPE_BADGE[doc.type] || 'badge-gray'}`}>{doc.type}</span>
            <span className="badge badge-gray">v{doc.version}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Owner: {doc.ownerName} · Updated: {new Date(doc.updatedAt).toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowReviewForm(true)} className="btn btn-primary">Request Change</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}>×</button></div>}

      {(doc.tags || []).length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {doc.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}

      <div className="tabs">
        {[['content', 'Content'], ['reviews', `Reviews (${reviewCycles.length})`], ['versions', `Versions (${versions.length})`], ['relationships', 'Relationships'], ['audit', 'Audit Trail']].map(([k, l]) => (
          <div key={k} className={`tab ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>{l}</div>
        ))}
      </div>

      {activeTab === 'content' && (
        <div className="card">
          <pre style={{ background: 'none', color: 'var(--text)', padding: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.8 }}>
            {doc.content}
          </pre>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div>
          {showReviewForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><div className="card-title">Request Change</div></div>
              <form onSubmit={handleSubmitReview}>
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input className="form-control" value={reviewForm.requesterName} onChange={e => setReviewForm(f => ({ ...f, requesterName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Change Description <span>*</span></label>
                  <input className="form-control" placeholder="What change are you requesting?" value={reviewForm.changeDescription} onChange={e => setReviewForm(f => ({ ...f, changeDescription: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Proposed Content</label>
                  <textarea className="form-control" style={{ minHeight: 200 }} value={reviewForm.proposedContent} onChange={e => setReviewForm(f => ({ ...f, proposedContent: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><div className="spinner" /> Submitting...</> : 'Submit Change Request'}
                  </button>
                  <button type="button" onClick={() => setShowReviewForm(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}
          {reviewCycles.length === 0 ? (
            <div className="empty-state"><h3>No review cycles</h3><p>Submit a change request above to start a review.</p></div>
          ) : (
            reviewCycles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(rc => (
              <ReviewCycleItem key={rc.reviewCycleId} rc={rc} onAction={handleReviewAction} />
            ))
          )}
        </div>
      )}

      {activeTab === 'versions' && (
        <div>
          {versions.length === 0 ? (
            <div className="empty-state"><h3>No versions</h3></div>
          ) : (
            versions.map(v => (
              <div key={v.versionNumber} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>Version {v.versionNumber}</span>
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                      by {v.createdBy} · {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="badge badge-gray">{v.changeDescription}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'relationships' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Outgoing Relationships</div>
            </div>
            {relationships.outgoing.length === 0 ? (
              <div className="empty-state"><h3>No outgoing relationships</h3></div>
            ) : (
              relationships.outgoing.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="badge badge-blue">{r.relationshipType}</span>
                  <span>→</span>
                  <Link to={`/documents/${r.toDocumentId}`}>{r.toDocumentId}</Link>
                  {r.description && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({r.description})</span>}
                </div>
              ))
            )}
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Incoming Relationships</div>
            </div>
            {relationships.incoming.length === 0 ? (
              <div className="empty-state"><h3>No incoming relationships</h3></div>
            ) : (
              relationships.incoming.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <Link to={`/documents/${r.fromDocumentId}`}>{r.fromDocumentId}</Link>
                  <span>→</span>
                  <span className="badge badge-purple">{r.relationshipType}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div>
          {auditRecords.length === 0 ? (
            <div className="empty-state"><h3>No audit records</h3></div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table className="table">
                <thead><tr><th>Timestamp</th><th>Action</th><th>By</th><th>Description</th></tr></thead>
                <tbody>
                  {auditRecords.map(a => (
                    <tr key={a.auditId}>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(a.timestamp).toLocaleString()}</td>
                      <td><span className="badge badge-blue">{a.action}</span></td>
                      <td style={{ fontSize: 12 }}>{a.authorName}</td>
                      <td style={{ fontSize: 12 }}>{a.changeDescription}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
