import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import LanguageSelect from "./pages/LanguageSelect";
import FinancialInputPage from "./pages/FinancialInputPage";
import RiskResultPage from "./pages/RiskResultPage";
import ExplanationPage from "./pages/ExplanationPage";
import OptimizationPage from "./pages/OptimizationPage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";
import { LanguageProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<SplashPage />} />
              <Route path="/home" element={<LoginPage />} />
              <Route path="/language" element={<LanguageSelect />} />
              <Route path="/input" element={<FinancialInputPage />} />
              <Route path="/result" element={<RiskResultPage />} />
              <Route path="/explanation" element={<ExplanationPage />} />
              <Route path="/optimization" element={<OptimizationPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
