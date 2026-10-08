import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getUserName } from '../api';

const STATUS_BADGE = {
  SUBMITTED: 'badge-yellow', APPROVED: 'badge-green', REJECTED: 'badge-red',
  MERGED: 'badge-purple', UNDER_REVIEW: 'badge-blue',
};
const STATUSES = ['', 'SUBMITTED', 'APPROVED', 'REJECTED', 'MERGED'];

export default function ReviewCyclesPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    api.reviewCycles.list(params).then(d => setReviews(d.reviewCycles || [])).catch(err => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleAction = async (action, rc, data) => {
    try {
      if (action === 'approve') await api.reviewCycles.approve(rc.documentId, rc.reviewCycleId, data);
      else if (action === 'reject') await api.reviewCycles.reject(rc.documentId, rc.reviewCycleId, data);
      else if (action === 'merge') await api.reviewCycles.merge(rc.documentId, rc.reviewCycleId, data);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const pendingCount = reviews.filter(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length;
  const approvedCount = reviews.filter(r => r.status === 'APPROVED').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Review Queue</div>
          <div className="page-subtitle">{pendingCount} pending · {approvedCount} ready to merge</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>
            {s || 'All Statuses'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading reviews...</span></div>
      ) : reviews.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No reviews found</h3>
            <p>Change requests appear here when submitted from a document page.</p>
          </div>
        </div>
      ) : (
        reviews.map(rc => <ReviewCard key={rc.reviewCycleId} rc={rc} onAction={handleAction} />)
      )}
    </div>
  );
}

function ReviewCard({ rc, onAction }) {
  const [approverName, setApproverName] = useState(getUserName());
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);

  const act = async (action) => {
    setLoading(true);
    try {
      if (action === 'approve') await onAction('approve', rc, { approverName });
      else if (action === 'reject') await onAction('reject', rc, { approverName, reason });
      else if (action === 'merge') await onAction('merge', rc, { mergedBy: approverName });
    } finally { setLoading(false); setShowReject(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span className={`badge ${STATUS_BADGE[rc.status] || 'badge-gray'}`}>{rc.status}</span>
            <Link to={`/documents/${rc.documentId}`} style={{ fontSize: 13, fontWeight: 500 }}>
              View Document →
            </Link>
          </div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{rc.changeDescription}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Requested by {rc.requesterName} · {new Date(rc.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

      {rc.rejectionReason && (
        <div className="alert alert-error" style={{ marginBottom: 8 }}>Rejected: {rc.rejectionReason}</div>
      )}

      {rc.approverName && rc.status === 'APPROVED' && (
        <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 8 }}>✓ Approved by {rc.approverName}</div>
      )}

      {(rc.status === 'SUBMITTED' || rc.status === 'UNDER_REVIEW') && (
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: showReject ? 8 : 0 }}>
            <input className="form-control" value={approverName} onChange={e => setApproverName(e.target.value)} placeholder="Your name" style={{ maxWidth: 160 }} />
            <button onClick={() => act('approve')} disabled={loading} className="btn btn-success btn-sm">Approve</button>
            <button onClick={() => setShowReject(!showReject)} disabled={loading} className="btn btn-danger btn-sm">Reject</button>
          </div>
          {showReject && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="form-control" placeholder="Rejection reason" value={reason} onChange={e => setReason(e.target.value)} />
              <button onClick={() => act('reject')} disabled={loading || !reason} className="btn btn-danger btn-sm">Submit</button>
            </div>
          )}
        </div>
      )}

      {rc.status === 'APPROVED' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="form-control" value={approverName} onChange={e => setApproverName(e.target.value)} placeholder="Your name" style={{ maxWidth: 160 }} />
          <button onClick={() => act('merge')} disabled={loading} className="btn btn-primary btn-sm">
            {loading ? <><div className="spinner" /> Merging...</> : '⬆ Merge Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
