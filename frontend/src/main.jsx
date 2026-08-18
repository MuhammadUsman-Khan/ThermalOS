import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "#FF6B2B", backgroundColor: "#0B0D14", minHeight: "100vh", fontFamily: "monospace" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>⚠️ ThermalOS Runtime Render Error</h1>
          <div style={{ padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,107,43,0.3)" }}>
            <p style={{ color: "#F43F5E", fontSize: "16px", fontWeight: "bold" }}>{this.state.error?.toString()}</p>
            <pre style={{ color: "#94A3B8", marginTop: "12px", fontSize: "12px", whiteSpace: "pre-wrap" }}>
              {this.state.info?.componentStack || this.state.error?.stack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: "20px", padding: "10px 20px", background: "#FF6B2B", color: "#000", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
