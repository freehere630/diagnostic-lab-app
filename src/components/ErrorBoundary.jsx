import React from "react";

// Catches render-time errors in the subtree and shows a recovery UI
// instead of a blank white screen. Logs to the browser console so
// devs can see the stack trace. Wrap your whole app in main.jsx.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep the stack for the console so it's not lost.
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const errMsg = this.state.error
      ? String(this.state.error.message || this.state.error)
      : "Unknown error";
    const componentStack = this.state.info?.componentStack
      ? String(this.state.info.componentStack).trim().split("\n").slice(0, 5).join("\n")
      : "";

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-900">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
              !
            </span>
            <div>
              <h1 className="text-base font-bold text-rose-700 leading-tight">
                Something went wrong on this screen
              </h1>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Your data is safe — nothing was saved incorrectly.
              </p>
            </div>
          </div>

          <pre className="text-[10px] font-mono bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-lg overflow-x-auto max-h-32 whitespace-pre-wrap">
            {errMsg}
            {componentStack ? `\n\n${componentStack}` : ""}
          </pre>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={() => {
                this.handleReset();
                window.location.href = window.location.pathname;
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}