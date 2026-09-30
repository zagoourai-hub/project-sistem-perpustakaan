import type { ReactNode } from "react";

export interface ClassNameProps {
  className?: string;
}

export interface ChildrenProps {
  children: ReactNode;
}

/** Standard async surface for a component that renders query data. */
export interface AsyncStateProps {
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}
