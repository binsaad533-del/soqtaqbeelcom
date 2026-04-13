import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ListingEditErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ListingEditErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center" dir="rtl">
          <AlertTriangle size={32} className="text-destructive/60" />
          <p className="text-sm text-muted-foreground">حصل خطأ أثناء تعديل الإعلان</p>
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

export default ListingEditErrorBoundary;
