import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import { authService } from "../../api/authService";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
  
    if (!name || !email || !password) {
      setError("Completează toate câmpurile");
      return;
    }
  
    try {
      await authService.register({ name, email, password });
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Creare cont</h1>
        <p className="auth-subtitle">
          Alătură-te platformei BucovinaStay
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nume complet"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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
            Creează cont
          </button>
        </form>

        <p className="auth-footer">
          Ai deja cont? <Link to="/auth/login">Autentifică-te</Link>
        </p>
      </div>
    </div>
  );
}
