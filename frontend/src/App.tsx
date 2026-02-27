import { useState, useEffect } from "react";
import LandingPage from "./components/landing/LandingPage";
import AppView from "./components/AppView";

export default function App() {
  const [view, setView] = useState<"landing" | "app">(() =>
    window.location.hash === "#app" ? "app" : "landing"
  );

  useEffect(() => {
    const handleHash = () => {
      setView(window.location.hash === "#app" ? "app" : "landing");
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const goToApp = () => {
    window.location.hash = "#app";
    window.scrollTo(0, 0);
  };

  const goToLanding = () => {
    window.location.hash = "";
    window.scrollTo(0, 0);
  };

  if (view === "app") {
    return <AppView onBack={goToLanding} />;
  }

  return <LandingPage onLaunchApp={goToApp} />;
}
