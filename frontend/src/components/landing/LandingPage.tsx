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

interface LandingPageProps {
  onLaunchApp: () => void;
}

export default function LandingPage({ onLaunchApp }: LandingPageProps) {
  return (
    <div className="noise-overlay">
      <Navbar onLaunchApp={onLaunchApp} />
      <Hero onLaunchApp={onLaunchApp} />
      <ValueStrip />
      <FormatMatrix />
      <Pipeline />
      <LanguageGrid />
      <Features />
      <TechStack />
      <FinalCTA onLaunchApp={onLaunchApp} />
      <Footer />
    </div>
  );
}
