import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AirIQ UI error]', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <main className="full-state">
        <div className="error-card">
          <strong>Something went wrong</strong>
          <span>The AirIQ interface hit an unexpected issue.</span>
          <button className="button primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </main>;
    }
    return this.props.children;
  }
}
