import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import { authService } from "../../api/authService";


export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Completează toate câmpurile");
      return;
    }

    try {
      setLoading(true);
      await authService.login({ email, password });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Autentificare</h1>
        <p className="auth-subtitle">
          Intră în contul tău BucovinaStay
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="auth-error">{error}</p>}

          <button className="btn btn-primary">
            Autentificare
          </button>
        </form>

        <p className="auth-footer">
          Nu ai cont? <Link to="/auth/register">Creează unul</Link>
        </p>
      </div>
    </div>
  );
}
