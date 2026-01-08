import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, DatabaseBackup } from 'lucide-react';

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
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical System Crash:", error, errorInfo);
  }

  private handleReset = () => {
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
              El motor de renderizado encontró una inconsistencia. Sus datos locales en IndexedDB están a salvo, pero la interfaz debe reiniciarse.
            </p>
            
            <div className="bg-black/40 rounded-xl p-4 mb-8 text-left border border-gray-800">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Traza del Error</p>
                <code className="text-[11px] text-red-400 font-mono break-words line-clamp-3">
                    {this.state.error?.message || "Error desconocido en el hilo principal"}
                </code>
            </div>

            <div className="space-y-3">
                <button 
                    onClick={this.handleReset}
                    className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw size={16} /> Reiniciar Interfaz
                </button>
                <button 
                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                    className="w-full py-3 text-gray-500 text-[10px] font-black uppercase hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                    <DatabaseBackup size={14} /> Purgar Caché de Sesión (Seguro)
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children || null;
  }
}

export default ErrorBoundary;