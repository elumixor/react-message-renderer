import { Component, type ErrorInfo, type ReactNode } from "react";

export type ErrorBoundaryFallback = ReactNode | ((error: Error, reset: () => void) => ReactNode);

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ErrorBoundaryFallback;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      return typeof fallback === "function" ? fallback(error, this.reset) : fallback;
    }
    return this.props.children;
  }
}
