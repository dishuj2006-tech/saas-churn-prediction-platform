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

  // Fetch history and analytics summary from backend
  const fetchData = async () => {
    try {
      const histRes = await fetch(`${API_BASE_URL}/api/prediction-history`);
      if (!histRes.ok) {
        throw new Error(`Could not load prediction history (HTTP ${histRes.status}).`);
      }
      setHistory(await histRes.json());

      const analRes = await fetch(`${API_BASE_URL}/api/analytics-summary`);
      if (!analRes.ok) {
        throw new Error(`Could not load analytics (HTTP ${analRes.status}).`);
      }
      setAnalytics(await analRes.json());
      setApiError('');
    } catch (err) {
      setApiError(`Unable to connect to the API. ${err.message}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/predict-churn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error(`Prediction failed (HTTP ${res.status}).`);
      }
      const data = await res.json();
      setResult(data);
      fetchData(); // Refresh history and charts
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
      {apiError && (
        <p role="alert" style={{ color: '#b91c1c', marginBottom: '1rem' }}>
          {apiError}
        </p>
      )}

      {/* KPI Summary Cards */}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Form Panel */}
        <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>Customer Metrics Input</h2>
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
              {loading ? 'Analyzing Risk...' : 'Run Churn Prediction'}
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

          {/* Recharts Distribution Graph */}
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
        </div>
      </div>

      {/* Historical Audit Logs Table */}
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
    </main>
  );
}