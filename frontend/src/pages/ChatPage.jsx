import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getUserName } from '../api';

const SUGGESTIONS = [
  'Which documents need updating if we add OAuth2 authentication?',
  'What are the dependencies of the deployment playbook?',
  'Draft an update to the runbook to include container health checks.',
  'Identify any contradictions in the authentication documentation.',
];

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI documentation assistant. I can help you:\n• Identify which documents need updating\n• Draft documentation changes\n• Detect dependencies and contradictions\n• Answer questions about your knowledge base\n\nWhat would you like to work on today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [mentionedDocs, setMentionedDocs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setError('');

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const data = await api.chat({
        message: userMsg,
        conversationHistory: history,
        authorName: getUserName(),
      });
      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
      setHistory(data.updatedHistory || []);
      setMentionedDocs(data.mentionedDocuments || []);
    } catch (err) {
      setError(err.message || 'Failed to get response');
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help you?' }]);
    setHistory([]);
    setMentionedDocs([]);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">AI Assistant</div>
          <div className="page-subtitle">Conversational AI for documentation management</div>
        </div>
        <button onClick={clearChat} className="btn btn-secondary">Clear Chat</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'flex-start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-message ${m.role}`}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {m.role === 'user' ? getUserName() : '🤖 AI Assistant'}
                  </div>
                  <div className="chat-bubble">{m.content}</div>
                </div>
              ))}
              {loading && (
                <div className="chat-message assistant">
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>🤖 AI Assistant</div>
                  <div className="chat-bubble">
                    <div className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--secondary)' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {error && <div className="alert alert-error" style={{ margin: '0 12px 8px' }}>{error}</div>}

            <div className="chat-input-area">
              <textarea
                className="form-control"
                placeholder="Ask about documentation, request changes, or describe a feature... (Enter to send, Shift+Enter for newline)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
              />
              <button onClick={() => sendMessage(input)} className="btn btn-primary" disabled={loading || !input.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Suggestions</div>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', marginBottom: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>

          {mentionedDocs.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Referenced Documents</div>
              {mentionedDocs.map(d => (
                <Link key={d.documentId} to={`/documents/${d.documentId}`} style={{ display: 'block', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--primary)' }}>
                  <div style={{ fontWeight: 500 }}>{d.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{d.type}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
