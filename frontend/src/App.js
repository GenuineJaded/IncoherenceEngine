import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "@/components/LandingPage";
import DiagnosticMirror from "@/components/DiagnosticMirror";

function App() {
  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/mirror" element={<DiagnosticMirror />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
