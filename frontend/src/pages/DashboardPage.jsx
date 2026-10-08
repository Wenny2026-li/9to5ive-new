import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function StatCard({ value, label, color }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const docTypeColor = { playbook: 'var(--primary)', runbook: 'var(--success)', brd: 'var(--warning)', sop: 'var(--secondary)' };

export default function DashboardPage() {
  const [docs, setDocs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.documents.list(),
      api.reviewCycles.list(),
    ]).then(([d, r]) => {
      setDocs(d.documents || []);
      setReviews(r.reviewCycles || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const pendingReviews = reviews.filter(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW');
  const approvedReviews = reviews.filter(r => r.status === 'APPROVED');
  const recentDocs = [...docs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading dashboard...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Knowledge Base Overview</div>
        </div>
        <Link to="/documents/new" className="btn btn-primary">+ New Document</Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 32 }}>
        <StatCard value={docs.length} label="Total Documents" color="var(--primary)" />
        <StatCard value={pendingReviews.length} label="Pending Reviews" color="var(--warning)" />
        <StatCard value={approvedReviews.length} label="Ready to Merge" color="var(--success)" />
        <StatCard value={reviews.length} label="Total Changes" color="var(--secondary)" />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Documents</div>
            <Link to="/documents" style={{ fontSize: 13, color: 'var(--primary)' }}>View all →</Link>
          </div>
          {recentDocs.length === 0 ? (
            <div className="empty-state">
              <h3>No documents yet</h3>
              <p>Create your first document to get started.</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Title</th><th>Type</th><th>Updated</th></tr></thead>
              <tbody>
                {recentDocs.map(d => (
                  <tr key={d.documentId}>
                    <td><Link to={`/documents/${d.documentId}`}>{d.title}</Link></td>
                    <td><span className="badge badge-blue">{d.type}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(d.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Pending Reviews</div>
            <Link to="/reviews" style={{ fontSize: 13, color: 'var(--primary)' }}>View all →</Link>
          </div>
          {pendingReviews.length === 0 ? (
            <div className="empty-state">
              <h3>No pending reviews</h3>
              <p>All reviews are up to date.</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Change</th><th>By</th><th>Status</th></tr></thead>
              <tbody>
                {pendingReviews.slice(0, 5).map(r => (
                  <tr key={r.reviewCycleId}>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Link to={`/documents/${r.documentId}`}>{r.changeDescription}</Link>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.requesterName}</td>
                    <td><span className="badge badge-yellow">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Quick Actions</div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/documents/new" className="btn btn-secondary">📄 Create Document</Link>
          <Link to="/impact-analysis" className="btn btn-secondary">🎯 Impact Analysis</Link>
          <Link to="/chat" className="btn btn-secondary">💬 AI Assistant</Link>
          <Link to="/audit" className="btn btn-secondary">📋 View Audit Trail</Link>
        </div>
      </div>
    </div>
  );
}
