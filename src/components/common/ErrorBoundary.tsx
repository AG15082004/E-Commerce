import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "../ui/button"

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Dashboard:", error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-red-100 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 mb-4 animate-bounce">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
            An unexpected error occurred while loading this analytics dashboard component. 
            Detailed message: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-[10px] break-all">{this.state.error?.message || "Unknown error"}</code>
          </p>
          <Button variant="primary" onClick={this.handleReset} className="gap-2">
            <RotateCcw size={16} />
            Reload Application
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
