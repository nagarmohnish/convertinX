import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password, name);
      navigate("/app");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-[22px] font-bold text-text-1 tracking-tight">
            Convertin<span className="text-accent">X</span>
          </Link>
          <p className="text-text-4 text-[14px] mt-2">Create your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface/60 border border-border rounded-2xl p-6 space-y-4"
        >
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-muted border border-red/15 text-[13px] text-red">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-text-3 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] placeholder:text-text-4 focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-text-3 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] placeholder:text-text-4 focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-text-3 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-1 text-[14px] placeholder:text-text-4 focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="Min 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-accent text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-[13px] text-text-4">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
