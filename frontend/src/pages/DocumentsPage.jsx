import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const DOC_TYPES = ['', 'playbook', 'runbook', 'brd', 'sop', 'architecture', 'api', 'other'];
const TYPE_BADGE = { playbook: 'badge-blue', runbook: 'badge-green', brd: 'badge-yellow', sop: 'badge-purple', architecture: 'badge-gray', api: 'badge-blue', other: 'badge-gray' };

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (typeFilter) params.type = typeFilter;
    if (search) params.q = search;
    api.documents.list(params).then(d => setDocs(d.documents || [])).catch(console.error).finally(() => setLoading(false));
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Knowledge Base</div>
          <div className="page-subtitle">{docs.length} document{docs.length !== 1 ? 's' : ''}</div>
        </div>
        <Link to="/documents/new" className="btn btn-primary">+ New Document</Link>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input className="form-control" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      <div className="filters">
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>Filter:</span>
        {DOC_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t || 'All Types'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Loading documents...</span></div>
      ) : docs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No documents found</h3>
            <p style={{ marginBottom: 16 }}>
              {search || typeFilter ? 'Try adjusting your search or filters.' : 'Create your first document to get started.'}
            </p>
            <Link to="/documents/new" className="btn btn-primary">Create Document</Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Version</th>
                <th>Tags</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.documentId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/documents/${d.documentId}`)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{d.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {(d.content || '').substring(0, 80)}...
                    </div>
                  </td>
                  <td><span className={`badge ${TYPE_BADGE[d.type] || 'badge-gray'}`}>{d.type}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{d.ownerName || d.createdBy}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>v{d.version || 1}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(d.tags || []).slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(d.updatedAt).toLocaleDateString()}
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
