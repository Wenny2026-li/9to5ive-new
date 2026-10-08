import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getUserName } from '../api';

const ENHANCEMENT_TYPES = ['feature', 'bug-fix', 'security', 'performance', 'architecture', 'api-change', 'process-change', 'other'];

export default function ImpactAnalysisPage() {
  const [form, setForm] = useState({ enhancement: '', enhancementType: 'feature', authorName: getUserName() });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.enhancement.trim()) { setError('Please describe the enhancement.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.impactAnalysis({ ...form });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getRelevanceClass = (score) => {
    if (score >= 75) return 'relevance-high';
    if (score >= 40) return 'relevance-medium';
    return 'relevance-low';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Impact Analysis</div>
          <div className="page-subtitle">Identify which documents need updating when a change is proposed</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Describe Your Enhancement</div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Enhancement Type</label>
              <select className="form-control" value={form.enhancementType} onChange={e => setForm(f => ({ ...f, enhancementType: e.target.value }))}>
                {ENHANCEMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('-', ' ').toUpperCase()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Enhancement Description <span>*</span></label>
              <textarea
                className="form-control"
                placeholder="Describe the proposed change or new feature in detail. E.g., 'Adding OAuth2 authentication support to replace the current basic auth mechanism...'"
                value={form.enhancement}
                onChange={e => setForm(f => ({ ...f, enhancement: e.target.value }))}
                style={{ minHeight: 150 }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? <><div className="spinner" /> Analyzing with AI...</> : '🎯 Analyze Impact'}
            </button>
          </form>
        </div>

        <div>
          {result && (
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="card-title">Analysis Results</div>
                  <span className="badge badge-green">AI Confidence: {result.confidenceScore}%</span>
                </div>
                {result.summary && (
                  <div className="alert alert-info" style={{ marginBottom: 12 }}>{result.summary}</div>
                )}
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {result.totalDocumentsAnalyzed} documents analyzed · {result.affectedDocuments.length} affected
                </div>
              </div>

              {result.affectedDocuments.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <h3>No affected documents found</h3>
                    <p>This enhancement appears to have no dependencies on existing documents.</p>
                  </div>
                </div>
              ) : (
                result.affectedDocuments.map((ad, i) => (
                  <div key={i} className="affected-doc">
                    <div>
                      <span className={`relevance ${getRelevanceClass(ad.relevanceScore || 0)}`}>
                        {ad.relevanceScore || 0}%
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        <Link to={`/documents/${ad.documentId}`}>{ad.title}</Link>
                        {ad.type && <span className="badge badge-gray" style={{ marginLeft: 8, fontSize: 11 }}>{ad.type}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {ad.explanation}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Link to={`/documents/${ad.documentId}`} className="btn btn-secondary btn-sm">View Document</Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!result && !loading && (
            <div className="card">
              <div className="empty-state">
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <h3>AI-Powered Impact Analysis</h3>
                <p>Describe your planned enhancement and the AI will identify all documents in the knowledge base that may need to be updated.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
