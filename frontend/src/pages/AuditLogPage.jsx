import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const ACTION_BADGE = {
  CREATE: 'badge-green', UPDATE: 'badge-blue', DELETE: 'badge-red',
  REVIEW_CYCLE_CREATED: 'badge-yellow', REVIEW_CYCLE_APPROVED: 'badge-green',
  REVIEW_CYCLE_REJECTED: 'badge-red', REVIEW_CYCLE_MERGED: 'badge-purple',
};

export default function AuditLogPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.audit.all().then(d => {
      setRecords(d.auditRecords || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r =>
    !filter ||
    (r.authorName && r.authorName.toLowerCase().includes(filter.toLowerCase())) ||
    (r.changeDescription && r.changeDescription.toLowerCase().includes(filter.toLowerCase())) ||
    (r.action && r.action.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Audit Trail</div>
          <div className="page-subtitle">Immutable, tamper-evident record of all changes</div>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        All audit records are immutable and cannot be modified or deleted. Each record includes a SHA-256 hash chain for tamper detection.
      </div>

      <div className="search-bar">
        <input
          className="form-control"
          placeholder="Filter by author, action, or description..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading audit trail...</span></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No audit records found</h3>
            <p>{filter ? 'Try adjusting your filter.' : 'No changes have been recorded yet.'}</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Document</th>
                <th>By</th>
                <th>Description</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.auditId}>
                  <td style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {new Date(a.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${ACTION_BADGE[a.action] || 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {a.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <Link to={`/documents/${a.documentId}`}>{a.documentId.substring(0, 8)}...</Link>
                  </td>
                  <td style={{ fontSize: 12 }}>{a.authorName}</td>
                  <td style={{ fontSize: 12, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.changeDescription}
                  </td>
                  <td>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-secondary)' }} title={a.contentHash}>
                      {(a.contentHash || '').substring(0, 8)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
