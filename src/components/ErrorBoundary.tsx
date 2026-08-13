import { Component, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-panel border border-edge rounded-lg p-6 max-w-md w-full">
            <h1 className="text-base font-semibold tracking-tight">Something went wrong</h1>
            <p className="text-[13px] text-muted mt-1 leading-relaxed">
              The app hit an unexpected error. Your resume text is safe — nothing is uploaded anywhere. Reload to continue.
            </p>
            {this.state.error.message && (
              <pre className="mt-3 p-2.5 bg-panel2 border border-edge rounded-md text-[11px] text-muted font-mono overflow-x-auto whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white text-[13px] font-medium transition-colors hover:opacity-90 cursor-pointer"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reload app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}