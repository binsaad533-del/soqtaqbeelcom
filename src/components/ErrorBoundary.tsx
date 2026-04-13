import React, { Component, type ErrorInfo } from "react";
import { logAudit } from "@/lib/security";
import AiStar from "@/components/AiStar";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
  isCritical: boolean;
}

/** Returns true for errors that can't be recovered from with a simple retry */
function isCriticalError(error: Error): boolean {
  const msg = (error.message || "").toLowerCase();
  const stack = (error.stack || "").toLowerCase();
  return (
    msg.includes("loading chunk") ||
    msg.includes("loading css chunk") ||
    msg.includes("dynamically imported module") ||
    msg.includes("syntax") ||
    msg.includes("unexpected token") ||
    msg.includes("is not defined") ||
    stack.includes("syntaxerror") ||
    error.name === "SyntaxError"
  );
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
    isRetrying: false,
    isCritical: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    const critical = isCriticalError(error);
    return { hasError: true, error, isCritical: critical };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", {
      message: error.message,
      name: error.name,
      stack: error.stack?.slice(0, 800),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });

    logAudit("error_500", "application", undefined, {
      error_message: error.message,
      error_stack: error.stack?.slice(0, 500),
      component_stack: errorInfo.componentStack?.slice(0, 500),
    });

    // For non-critical errors: show toast and auto-retry (up to 2 times)
    if (!isCriticalError(error) && this.state.retryCount < 2) {
      toast.error("حصل خطأ، جاري إعادة المحاولة...", { duration: 3000 });
      this.setState({ isRetrying: true });
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          isRetrying: false,
          isCritical: false,
          retryCount: prev.retryCount + 1,
        }));
      }, 1500);
    }
  }

  handleRetry = () => {
    this.setState({ isRetrying: true });
    setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        isRetrying: false,
        isCritical: false,
        retryCount: prev.retryCount + 1,
      }));
    }, 1500);
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    // Non-critical errors that exhausted auto-retries, or critical errors: show fallback UI
    if (this.state.hasError && !this.state.isRetrying) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center px-4" dir="rtl">
          <div className="max-w-md w-full text-center">
            {/* Animated Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/5 border border-destructive/10 flex items-center justify-center">
                <AiStar size={36} />
              </div>
            </div>

            {/* Message */}
            <h1 className="text-xl font-semibold text-foreground mb-2">
              حدث خطأ غير متوقع
            </h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {this.state.isCritical
                ? "يبدو أن هناك مشكلة في تحميل الصفحة. يرجى إعادة تحميل المتصفح."
                : "نعتذر عن هذا الخطأ. فريقنا يعمل على إصلاحه."}
            </p>

            {/* Status */}
            {this.state.retryCount > 0 && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xs text-warning">
                  تمت المحاولة {this.state.retryCount} مرة — إذا استمرت المشكلة، يرجى تحديث الصفحة
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {this.state.isCritical ? (
                <button
                  onClick={this.handleReload}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-primary to-primary/70 text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                >
                  إعادة تحميل الصفحة
                </button>
              ) : (
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-primary to-primary/70 text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                >
                  إعادة المحاولة
                </button>
              )}
              <a
                href="/"
                className="px-6 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                العودة للرئيسية
              </a>
            </div>

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

    // During auto-retry, keep rendering children (will re-mount)
    if (this.state.isRetrying) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">جاري إعادة المحاولة...</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
