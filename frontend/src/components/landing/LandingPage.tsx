import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Hero from "./Hero";
import ValueStrip from "./ValueStrip";
import FormatMatrix from "./FormatMatrix";
import LanguageGrid from "./LanguageGrid";
import Pipeline from "./Pipeline";
import Features from "./Features";
import TechStack from "./TechStack";
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";

export default function LandingPage() {
  const navigate = useNavigate();
  const goToApp = () => navigate("/app");

  return (
    <div className="noise-overlay">
      <Navbar onLaunchApp={goToApp} />
      <Hero onLaunchApp={goToApp} />
      <ValueStrip />
      <FormatMatrix />
      <Pipeline />
      <LanguageGrid />
      <Features />
      <TechStack />
      <FinalCTA onLaunchApp={goToApp} />
      <Footer />
    </div>
  );
}
