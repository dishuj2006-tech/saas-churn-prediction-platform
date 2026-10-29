'use client';
import { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
  try {
    const histRes = await fetch('http://localhost:8000/api/prediction-history');
    if (histRes.ok) {
      const data = await histRes.json();
      setHistory(data);
    }

    const analRes = await fetch('http://localhost:8000/api/analytics-summary');
    if (analRes.ok) {
      const analData = await analRes.json();
      setAnalytics(analData);
    }
  } catch (err) {
    // Gracefully log network errors without throwing unhandled UI exceptions
    console.log('Backend server starting up or unreachable:', err);
  }
};

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/predict-churn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setResult(data);
      fetchHistory();
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0 }}>SaaS Subscription Churn Predictor</h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
          Machine Learning Risk Analytics & Database Prediction Logging
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Form Panel */}
        <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>Customer Metrics</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Tenure (Months)
              </label>
              <input
                type="number"
                value={formData.tenure_months}
                onChange={(e) => setFormData({ ...formData, tenure_months: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Monthly Charges ($)
              </label>
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
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Support Tickets (Past 6 Months)
              </label>
              <input
                type="number"
                value={formData.support_tickets}
                onChange={(e) => setFormData({ ...formData, support_tickets: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Contract Type
              </label>
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
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Payment Method
              </label>
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
              {loading ? 'Evaluating...' : 'Predict Churn'}
            </button>
          </form>
        </section>

        {/* Prediction Results Panel */}
        <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>Model Evaluation</h2>
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '1rem',
                borderRadius: '6px',
                backgroundColor: result.risk_level === 'High Risk' ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${result.risk_level === 'High Risk' ? '#fecaca' : '#bbf7d0'}`
              }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Risk Level</span>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: result.risk_level === 'High Risk' ? '#dc2626' : '#16a34a'
                }}>
                  {result.risk_level}
                </div>
              </div>

              <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Churn Probability Score</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                  {result.churn_probability}%
                </div>
              </div>

              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Saved to Database (Log ID: #{result.id})
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Input metrics and click "Predict Churn" to analyze subscriber risk score.</p>
          )}
        </section>
      </div>

      {/* History Table */}
      <section style={{ marginTop: '2.5rem', background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '1rem' }}>Historical Audit Logs (Database)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.5rem' }}>Log ID</th>
                <th style={{ padding: '0.5rem' }}>Tenure</th>
                <th style={{ padding: '0.5rem' }}>Monthly ($)</th>
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
                  <td style={{ padding: '0.5rem' }}>{item.tenure_months} mths</td>
                  <td style={{ padding: '0.5rem' }}>${item.monthly_charges}</td>
                  <td style={{ padding: '0.5rem' }}>{item.support_tickets}</td>
                  <td style={{ padding: '0.5rem' }}>{item.contract_type}</td>
                  <td style={{ padding: '0.5rem' }}>{item.churn_probability}%</td>
                  <td style={{
                    padding: '0.5rem',
                    fontWeight: 600,
                    color: item.risk_level === 'High Risk' ? '#dc2626' : '#16a34a'
                  }}>
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