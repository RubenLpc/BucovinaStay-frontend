import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";
import { authService } from "../../api/authService";
import { useAuthStore } from "../../stores/authStore";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // nu destructura user aici pentru redirect, e posibil să fie stale
  const { isAuthenticated } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Completează toate câmpurile");
      return;
    }

    try {
      setLoading(true);

      // IMPORTANT: folosește user din răspuns
      const res = await authService.login({ email, password });
      const loggedUser = res?.user;

      // dacă ai un flow cu redirect "from"
      const from = location.state?.from;

      // 1) dacă ai from explicit, respectă-l
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // 2) altfel, role-based
      if (loggedUser?.role === "host") {
        navigate("/host/dashboard", { replace: true });
      } else if(loggedUser?.role === "admin") {
        navigate("/admin", { replace: true });
      }
      else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err?.message || "Autentificare eșuată");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Autentificare</h1>
        <p className="auth-subtitle">Intră în contul tău BucovinaStay</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <p className="auth-error">{error}</p>}

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Se autentifică..." : "Autentificare"}
          </button>
        </form>

        <p className="auth-footer">
          Nu ai cont? <Link to="/auth/register">Creează unul</Link>
        </p>
      </div>
    </div>
  );
}
