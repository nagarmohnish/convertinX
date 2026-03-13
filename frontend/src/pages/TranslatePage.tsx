import { useNavigate } from "react-router-dom";
import AppView from "../components/AppView";

export default function TranslatePage() {
  const navigate = useNavigate();
  return <AppView onBack={() => navigate("/app")} />;
}
