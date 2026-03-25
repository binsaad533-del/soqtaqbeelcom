import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionGuard from "./components/SessionGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import OnboardingTour from "./components/OnboardingTour";
import HomePage from "./pages/HomePage";
import MarketplacePage from "./pages/MarketplacePage";
import ListingDetailsPage from "./pages/ListingDetailsPage";
import CreateListingPage from "./pages/CreateListingPage";
import NegotiationPage from "./pages/NegotiationPage";
import AgreementPage from "./pages/AgreementPage";
import DashboardRouter from "./pages/DashboardRouter";
import MonitoringDashboardPage from "./pages/MonitoringDashboardPage";
import LoginPage from "./pages/LoginPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import UnsubscribePage from "./pages/UnsubscribePage";
import HowItWorksPage from "./pages/HowItWorksPage";
import InstallPage from "./pages/InstallPage";
import NotFound from "./pages/NotFound";
import AgreementsArchivePage from "./pages/AgreementsArchivePage";
import SellerProfilePage from "./pages/SellerProfilePage";
import HelpCenterPage from "./pages/HelpCenterPage";
import BlogPage from "./pages/BlogPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
        <AuthProvider>
          <ErrorBoundary>
          <SessionGuard />
          <OnboardingTour />
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/seller/:id" element={<SellerProfilePage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/listing/:id" element={<ListingDetailsPage />} />
              <Route
                path="/create-listing"
                element={
                  <ProtectedRoute>
                    <CreateListingPage />
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
                  <ProtectedRoute>
                    <AgreementsArchivePage />
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
                  <ProtectedRoute>
                    <MonitoringDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
          </ErrorBoundary>
        </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
