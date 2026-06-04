import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import DiagnosticMirror from "./pages/DiagnosticMirror";

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Check if API key exists in local storage on load
  useEffect(() => {
    const savedKey = localStorage.getItem("openrouter_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleEnter = (key: string) => {
    setApiKey(key);
  };

  const handleLogout = () => {
    localStorage.removeItem("openrouter_api_key");
    setApiKey(null);
  };

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster position="top-center" />
          {apiKey ? (
            <DiagnosticMirror apiKey={apiKey} onLogout={handleLogout} />
          ) : (
            <LandingPage onEnter={handleEnter} />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
