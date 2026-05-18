import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
    // Error caught by boundary
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center p-8 text-center rounded-sm"
          style={{ background: '#12121A', border: '1px solid #252535' }}
        >
          <span className="font-mono text-[10px] tracking-widest mb-2" style={{ color: '#FF006E' }}>
            // SYSTEM ERROR
          </span>
          <p className="font-heading text-lg font-bold mb-2" style={{ color: '#E8E8FF' }}>
            MODULE CRASHED
          </p>
          <p className="font-mono text-xs mb-4" style={{ color: '#6B6B8A' }}>
            {this.props.fallbackMessage || 'Something went wrong. Try reloading.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="hud-btn hud-btn-primary px-4 py-2 rounded-sm text-xs active:scale-95"
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
