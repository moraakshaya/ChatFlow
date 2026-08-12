import React, { useState, useEffect } from 'react';
import { ChatWidget } from './ChatWidget';

function App() {
  const [widgetToken, setWidgetToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // For the sake of this mock CRM, we hardcode the API Key.
  // IN REALITY: This API key must never be in the browser!
  // The mock CRM backend would make this call and return only the widgetToken to the browser.
  const fetchWidgetSession = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch from our backend to get the API Key for project_1 (we'll just use a mock request here,
      // but to actually make it work, you need a real API key. 
      // For this demo portfolio, we'll assume the user drops their API Key here).
      const MOCK_API_KEY = "pk_your_api_key_here"; 
      const MOCK_PROJECT_ID = "your_project_id_here";
      
      const response = await fetch(`http://localhost:3000/api/projects/${MOCK_PROJECT_ID}/widget/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MOCK_API_KEY
        },
        body: JSON.stringify({
          externalUserId: "CRM-10023",
          name: "John Doe",
          email: "john@crm-example.com"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to authenticate widget. Please set MOCK_API_KEY and MOCK_PROJECT_ID in App.jsx.");
      }

      const data = await response.json();
      setWidgetToken(data.data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crm-layout">
      <aside className="crm-sidebar">
        <h2>Acme CRM</h2>
        <nav>
          <ul>
            <li>Dashboard</li>
            <li>Leads</li>
            <li>Clients</li>
            <li>Reports</li>
            <li>Settings</li>
          </ul>
        </nav>
      </aside>

      <main className="crm-content">
        <header className="crm-header">
          <h1>Welcome back, John Doe</h1>
        </header>

        <section>
          <h2>Client Overview</h2>
          <p>You have 12 active leads to contact today.</p>
          
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3>Widget Integration Testing</h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              To test the widget, update `MOCK_API_KEY` and `MOCK_PROJECT_ID` in `widget/src/App.jsx` with real values from your backend database.
            </p>
            {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
            
            {!widgetToken ? (
              <button 
                onClick={fetchWidgetSession}
                disabled={loading}
                style={{
                  background: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                {loading ? 'Authenticating...' : 'Simulate Backend Auth & Load Widget'}
              </button>
            ) : (
              <div style={{ color: 'green' }}>✓ Widget Authenticated Successfully. Look for the chat button in the bottom right!</div>
            )}
          </div>
        </section>
      </main>

      {/* Render the widget if we have a token */}
      {widgetToken && (
        <ChatWidget 
          token={widgetToken} 
          title="Acme Support" 
          primaryColor="#3b82f6" 
        />
      )}
    </div>
  );
}

export default App;
