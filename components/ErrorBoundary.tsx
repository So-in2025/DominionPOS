import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Explicitly declare the state property on the class. This resolves errors where `this.state` might
  // not be recognized in certain build configurations, even when initialized in the constructor.
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical System Crash:", error, errorInfo);
  }

  handleReset = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dp-dark flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-dp-charcoal rounded-2xl p-8 border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center animate-modal-in">
            <div className="inline-flex p-4 bg-red-500/10 rounded-full mb-6">
              <AlertOctagon size={48} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Fallo Crítico de Núcleo</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              El motor de renderizado encontró una inconsistencia. Sus datos locales están a salvo, pero la interfaz debe reiniciarse.
            </p>
            
            <div className="bg-black/40 rounded-xl p-4 mb-8 text-left text-xs font-mono text-red-300 overflow-auto max-h-24 custom-scrollbar">
              <p className="font-bold text-red-400">Error: {this.state.error?.name}</p>
              <p>{this.state.error?.message}</p>
            </div>
            
            <div className="flex gap-4">
              <button onClick={this.handleReset} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-all">
                <RefreshCw size={16} /> Reiniciar App
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Fix: In React class components, props are accessed via `this.props`.
    return this.props.children;
  }
}

export default ErrorBoundary;