export const metadata = {
  title: 'SaaS Churn Prediction System',
  description: 'Machine Learning Churn Analytics Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}