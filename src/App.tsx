import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useSearchParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionGuard from "./components/SessionGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import OnboardingTour from "./components/OnboardingTour";

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const ListingDetailsPage = lazy(() => import("./pages/ListingDetailsPage"));
const CreateListingPage = lazy(() => import("./pages/CreateListingPage"));

/** Wrapper that forces a full remount when ?new=1 is toggled */
const CreateListingPageKeyed = () => {
  const [sp] = useSearchParams();
  const forceKey = sp.get("new") === "1" ? "new" : "draft";
  return <CreateListingPage key={forceKey} />;
};
const NegotiationPage = lazy(() => import("./pages/NegotiationPage"));
const AgreementPage = lazy(() => import("./pages/AgreementPage"));
const DashboardRouter = lazy(() => import("./pages/DashboardRouter"));
const MonitoringDashboardPage = lazy(() => import("./pages/MonitoringDashboardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AgreementsArchivePage = lazy(() => import("./pages/AgreementsArchivePage"));
const SellerProfilePage = lazy(() => import("./pages/SellerProfilePage"));
const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const CommissionPage = lazy(() => import("./pages/CommissionPage"));
const EscrowPage = lazy(() => import("./pages/EscrowPage"));
const ViewCustomerPage = lazy(() => import("./pages/ViewCustomerPage"));
const DealPipelinePage = lazy(() => import("./pages/DealPipelinePage"));
const AdminRevenuePage = lazy(() => import("./pages/AdminRevenuePage"));
const AdminDealsPage = lazy(() => import("./pages/AdminDealsPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const PdfPreviewPage = lazy(() => import("./pages/PdfPreviewPage"));
const VerifySellerPage = lazy(() => import("./pages/VerifySellerPage"));
const AdminVerificationsPage = lazy(() => import("./pages/AdminVerificationsPage"));
const SellerDashboardPage = lazy(() => import("./pages/SellerDashboardPage"));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2 min — avoid refetches on tab focus
      gcTime: 10 * 60 * 1000,         // 10 min garbage collection
      refetchOnWindowFocus: false,     // prevent unnecessary refetches
      retry: 1,                        // single retry on failure
    },
  },
});

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">جاري التحميل...</span>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
        <CurrencyProvider>
        <AuthProvider>
          <ErrorBoundary>
          <SessionGuard />
          <OnboardingTour />
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/seller/:id" element={<SellerProfilePage />} />
                <Route path="/help" element={<HelpCenterPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/commission" element={<CommissionPage />} />
                {/* Escrow page disabled for launch — will re-enable with payment integration */}
                {/* <Route path="/escrow" element={<EscrowPage />} /> */}
                <Route path="/listing/:id" element={<ListingDetailsPage />} />
                <Route
                  path="/create-listing"
                  element={
                    <ProtectedRoute>
                      <CreateListingPageKeyed />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/negotiate/:id"
                  element={
                    <ProtectedRoute>
                      <NegotiationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/agreement/:id"
                  element={
                    <ProtectedRoute>
                      <AgreementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/agreements-archive"
                  element={
                    <ProtectedRoute allowedRoles={["platform_owner", "supervisor", "customer"]}>
                      <AgreementsArchivePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/view-customer/:userId"
                  element={
                    <ProtectedRoute allowedRoles={["platform_owner"]}>
                      <ViewCustomerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardRouter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/monitoring"
                  element={
                    <ProtectedRoute allowedRoles={["platform_owner", "supervisor"]}>
                      <MonitoringDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/deal-pipeline"
                  element={
                    <ProtectedRoute allowedRoles={["platform_owner", "supervisor"]}>
                      <DealPipelinePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/revenue"
                  element={
                    <ProtectedRoute allowedRoles={["platform_owner"]}>
                      <AdminRevenuePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/deals"
                  element={
                    <ProtectedRoute allowedRoles={["platform_owner", "supervisor"]}>
                      <AdminDealsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/verifications"
                  element={
                    <ProtectedRoute allowedRoles={["platform_owner", "supervisor"]}>
                      <AdminVerificationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <MessagesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/invoice/:id"
                  element={
                    <ProtectedRoute>
                      <InvoicePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/verify-seller"
                  element={
                    <ProtectedRoute>
                      <VerifySellerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seller-dashboard"
                  element={
                    <ProtectedRoute>
                      <SellerDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/install" element={<InstallPage />} />
                <Route
                  path="/notification-settings"
                  element={
                    <ProtectedRoute>
                      <NotificationSettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />
                <Route path="/pdf-preview" element={<PdfPreviewPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
          </ErrorBoundary>
        </AuthProvider>
        </CurrencyProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;