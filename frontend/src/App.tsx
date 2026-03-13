import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./components/landing/LandingPage";
import ToolHubPage from "./pages/ToolHubPage";
import TranslatePage from "./pages/TranslatePage";
import TTSPage from "./pages/TTSPage";
import STTPage from "./pages/STTPage";
import AudioSeparatePage from "./pages/AudioSeparatePage";
import DocTranslatePage from "./pages/DocTranslatePage";
import ImageOCRPage from "./pages/ImageOCRPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app" element={<ToolHubPage />} />
          <Route path="/app/translate" element={<TranslatePage />} />
          <Route path="/app/tts" element={<TTSPage />} />
          <Route path="/app/stt" element={<STTPage />} />
          <Route path="/app/audio-separate" element={<AudioSeparatePage />} />
          <Route path="/app/doc-translate" element={<DocTranslatePage />} />
          <Route path="/app/image-ocr" element={<ImageOCRPage />} />
          <Route path="/app/dashboard" element={<DashboardPage />} />
          {/* Redirect old hash route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
