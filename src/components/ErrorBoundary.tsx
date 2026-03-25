import React, { Component, type ErrorInfo } from "react";
import { logAudit } from "@/lib/security";
import AiStar from "@/components/AiStar";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
    isRetrying: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logAudit("error_500", "application", undefined, {
      error_message: error.message,
      error_stack: error.stack?.slice(0, 500),
      component_stack: errorInfo.componentStack?.slice(0, 500),
    });
  }

  handleRetry = () => {
    this.setState({ isRetrying: true });
    setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
      }));
    }, 1500);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center px-4" dir="rtl">
          <div className="max-w-md w-full text-center">
            {/* Animated Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/5 border border-destructive/10 flex items-center justify-center">
                {this.state.isRetrying ? (
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <AiStar size={36} />
                )}
              </div>
            </div>

            {/* Message */}
            <h1 className="text-xl font-semibold text-foreground mb-2">
              {this.state.isRetrying ? "جاري إعادة المحاولة..." : "حدث خطأ غير متوقع"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {this.state.isRetrying
                ? "نحن نعمل على إصلاح المشكلة، يرجى الانتظار..."
                : "نعتذر عن هذا الخطأ. فريقنا يعمل على إصلاحه."}
            </p>

            {/* Status */}
            {this.state.retryCount > 0 && !this.state.isRetrying && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xs text-warning">
                  تمت المحاولة {this.state.retryCount} مرة — إذا استمرت المشكلة، يرجى تحديث الصفحة
                </p>
              </div>
            )}

            {/* Actions */}
            {!this.state.isRetrying && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-primary to-primary/70 text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                >
                  إعادة المحاولة
                </button>
                <a
                  href="/"
                  className="px-6 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  العودة للرئيسية
                </a>
              </div>
            )}

            {/* AI Hint */}
            <div className="mt-8 flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <AiStar size={16} />
              <p className="text-xs text-muted-foreground">
                المساعد الذكي متاح لمساعدتك — انقر على النجمة في الزاوية
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
