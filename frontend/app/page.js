'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export default function ChurnDashboard() {
  const [formData, setFormData] = useState({
    tenure_months: 12,
    monthly_charges: 85.0,
    support_tickets: 2,
    contract_type: 'Monthly',
    payment_method: 'Credit Card',
  });

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState({
    total_predictions: 0,
    high_risk_count: 0,
    low_risk_count: 0,
    average_monthly_charges: 0,
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [token, setToken] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [authMode, setAuthMode] = useState('demo');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  const fetchData = async (authToken) => {
    if (!authToken) {
      setHistory([]);
      setAnalytics({
        total_predictions: 0,
        high_risk_count: 0,
        low_risk_count: 0,
        average_monthly_charges: 0,
      });
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const histRes = await fetch(`${API_BASE_URL}/api/prediction-history`, { headers });
      if (!histRes.ok) {
        throw new Error(`Could not load prediction history (HTTP ${histRes.status}).`);
      }
      setHistory(await histRes.json());

      const analRes = await fetch(`${API_BASE_URL}/api/analytics-summary`, { headers });
      if (!analRes.ok) {
        throw new Error(`Could not load analytics (HTTP ${analRes.status}).`);
      }
      setAnalytics(await analRes.json());
      setApiError('');
    } catch (err) {
      if (err.message.includes('HTTP 401')) {
        window.sessionStorage.removeItem('churn-auth-token');
        setToken('');
        setAccountEmail('');
      }
      setApiError(`Unable to connect to the API. ${err.message}`);
    }
  };

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem('churn-auth-token');
    const storedEmail = window.sessionStorage.getItem('churn-account-email');
    if (storedToken) {
      setToken(storedToken);
      setAccountEmail(storedEmail || '');
      setAuthMode('account');
    }
  }, []);

  useEffect(() => {
    fetchData(token);
  }, [token]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setApiError('');
    try {
      const action = authMode === 'register' ? 'register' : 'login';
      const response = await fetch(`${API_BASE_URL}/api/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Account request failed (HTTP ${response.status}).`);
      }
      window.sessionStorage.setItem('churn-auth-token', data.token);
      window.sessionStorage.setItem('churn-account-email', data.email);
      setToken(data.token);
      setAccountEmail(data.email);
      setAuthMode('account');
      setAuthForm({ email: '', password: '' });
    } catch (err) {
      setApiError(`Unable to ${authMode === 'register' ? 'create an account' : 'sign in'}. ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem('churn-auth-token');
    window.sessionStorage.removeItem('churn-account-email');
    setToken('');
    setAccountEmail('');
    setResult(null);
    setAuthMode('demo');
    setApiError('');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all saved predictions? This cannot be undone.')) {
      return;
    }

    setApiError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Account deletion failed (HTTP ${response.status}).`);
      }
      handleLogout();
    } catch (err) {
      setApiError(`Unable to delete your account. ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(
        `${API_BASE_URL}${token ? '/api/predict-churn' : '/api/demo/predict-churn'}`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
        }
      );
      if (!res.ok) {
        throw new Error(`Prediction failed (HTTP ${res.status}).`);
      }
      const data = await res.json();
      setResult(data);
      if (token) {
        fetchData(token);
      }
    } catch (err) {
      setApiError(`Unable to run the prediction. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Chart data configuration
  const chartData = [
    { name: 'Low Risk', count: analytics.low_risk_count },
    { name: 'High Risk', count: analytics.high_risk_count },
  ];

  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0 }}>SaaS Subscription Churn Analytics</h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
          Advanced Machine Learning Prediction Engine & Database Intelligence Dashboard
        </p>
      </header>
      <p style={{ background: '#fffbeb', color: '#92400e', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
        Model scores are based on synthetic training data and have not been validated for real customer decisions.
      </p>
      {apiError && (
        <p role="alert" style={{ color: '#b91c1c', marginBottom: '1rem' }}>
          {apiError}
        </p>
      )}

      {!token ? (
        <section style={{ background: '#fff', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button type="button" onClick={() => setAuthMode('demo')}>Public demo</button>
            <button type="button" onClick={() => setAuthMode('login')}>Sign in</button>
            <button type="button" onClick={() => setAuthMode('register')}>Create account</button>
          </div>
          {authMode === 'login' || authMode === 'register' ? (
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <label>
                <span style={{ display: 'block', fontSize: '0.8rem' }}>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </label>
              <label>
                <span style={{ display: 'block', fontSize: '0.8rem' }}>Password</span>
                <input
                  type="password"
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  minLength={authMode === 'register' ? 12 : undefined}
                  maxLength={128}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </label>
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Please wait...' : authMode === 'register' ? 'Create account' : 'Sign in'}
              </button>
            </form>
          ) : (
            <p style={{ margin: 0, color: '#475569' }}>
              Demo mode: predictions are not saved. Use fictional values only; sign in to save predictions privately to your account.
            </p>
          )}
        </section>
      ) : (
        <p style={{ color: '#475569', marginBottom: '1.5rem' }}>
          Signed in as {accountEmail}. Saved predictions and analytics are private to this account.{' '}
          <button type="button" onClick={handleLogout}>Sign out</button>{' '}
          <button type="button" onClick={handleDeleteAccount}>Delete account and data</button>
        </p>
      )}

      {token && (
      <>
      {/* Account-only KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Audits</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{analytics.total_predictions}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>High Risk Customers</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>{analytics.high_risk_count}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Safe Customers</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a' }}>{analytics.low_risk_count}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Avg. Monthly Charges</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb' }}>${analytics.average_monthly_charges}</div>
        </div>
      </div>
      </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Form Panel */}
        <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>{token ? 'Private Customer Metrics' : 'Demo Metrics'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Tenure (Months)</label>
              <input
                type="number"
                value={formData.tenure_months}
                onChange={(e) => setFormData({ ...formData, tenure_months: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Monthly Charges ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.monthly_charges}
                onChange={(e) => setFormData({ ...formData, monthly_charges: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Support Tickets (Past 6 Months)</label>
              <input
                type="number"
                value={formData.support_tickets}
                onChange={(e) => setFormData({ ...formData, support_tickets: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Contract Type</label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
                <option value="Two-Year">Two-Year</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="PayPal">PayPal</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#2563eb',
                color: '#fff',
                padding: '0.75rem',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              {loading ? 'Analyzing Risk...' : token ? 'Run Private Prediction' : 'Run Demo Prediction'}
            </button>
          </form>
        </section>

        {/* Right Column: Real-time Evaluation & Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>Latest Prediction Score</h2>
            {result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: result.risk_level === 'High Risk' ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${result.risk_level === 'High Risk' ? '#fecaca' : '#bbf7d0'}`
                }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Risk Level Assessment</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: result.risk_level === 'High Risk' ? '#dc2626' : '#16a34a' }}>
                    {result.risk_level}
                  </div>
                </div>
                <div style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Churn Probability</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{result.churn_probability}%</div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Submit customer metrics to evaluate risk score.</p>
            )}
          </section>

          {token && (
          <>
          {/* Account-only distribution graph */}
          <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.1rem', marginTop: 0, marginBottom: '0.5rem' }}>Risk Distribution Overview</h2>
            <div style={{ width: '100%', height: '160px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'High Risk' ? '#dc2626' : '#16a34a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          </>
          )}
        </div>
      </div>

      {token && (
      <>
      {/* Account-only prediction history */}
      <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '1rem' }}>Database Audit History</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.5rem' }}>ID</th>
                <th style={{ padding: '0.5rem' }}>Tenure</th>
                <th style={{ padding: '0.5rem' }}>Monthly</th>
                <th style={{ padding: '0.5rem' }}>Tickets</th>
                <th style={{ padding: '0.5rem' }}>Contract</th>
                <th style={{ padding: '0.5rem' }}>Probability</th>
                <th style={{ padding: '0.5rem' }}>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem', color: '#64748b' }}>#{item.id}</td>
                  <td style={{ padding: '0.5rem' }}>{item.tenure_months} mos</td>
                  <td style={{ padding: '0.5rem' }}>${item.monthly_charges}</td>
                  <td style={{ padding: '0.5rem' }}>{item.support_tickets}</td>
                  <td style={{ padding: '0.5rem' }}>{item.contract_type}</td>
                  <td style={{ padding: '0.5rem' }}>{item.churn_probability}%</td>
                  <td style={{ padding: '0.5rem', fontWeight: 600, color: item.risk_level === 'High Risk' ? '#dc2626' : '#16a34a' }}>
                    {item.risk_level}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}
    </main>
  );
}