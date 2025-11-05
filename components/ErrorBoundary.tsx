import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  // FIX: Initialize state directly as a class property for correct type inference and modern React class component syntax.
  // The previous constructor was redundant and potentially causing issues.
  public state: State = { hasError: false };

  // FIX: Add constructor to properly initialize `this.props` via super(props).
  // While state can be initialized via class fields, `props` still typically flows through `super(props)`.
  constructor(props: Props) {
    super(props);
    // state is already initialized via class property, no need to set here
  }

  static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            padding: '2rem', 
            textAlign: 'center' 
        }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-destructive)', fontSize: '1.75rem' }}>
            Something went wrong.
          </h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;