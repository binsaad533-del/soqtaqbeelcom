import React, { Component, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  /** Short label shown in the error UI, e.g. "إنشاء الإعلان" */
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for individual pages / sections.
 * Shows inline error + retry button without breaking the rest of the layout.
 */
class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[PageErrorBoundary${this.props.label ? ` — ${this.props.label}` : ""}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center" dir="rtl">
          <div className="w-14 h-14 rounded-2xl bg-destructive/5 border border-destructive/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-destructive/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              حدث خطأ أثناء {this.props.label ? `تحميل ${this.props.label}` : "تحميل هذا القسم"}
            </p>
            <p className="text-xs text-muted-foreground">
              لا تقلق — باقي الصفحة تعمل بشكل طبيعي
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => this.setState({ hasError: false })}
          >
            <RefreshCw size={14} />
            إعادة المحاولة
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;
