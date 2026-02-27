import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const emailValue = email.trim();
    if (!emailValue || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    if (!emailValue.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const resp =
        mode === "existing"
          ? await fetch(`${API_BASE}/users/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: emailValue }),
            })
          : await fetch(`${API_BASE}/users/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: (name.trim() || emailValue.split("@")[0] || "User"),
                email: emailValue,
              }),
            });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(
          data?.detail ||
            (mode === "existing"
              ? "No account found. Please create a new user."
              : "Could not create account right now. Please try again."),
        );
        setLoading(false);
        return;
      }
      const user = await resp.json();
      localStorage.setItem("finpilot_user", JSON.stringify(user));
      navigate(mode === "existing" ? "/dashboard" : "/language");
    } catch {
      setError("Backend is unreachable. Start the API server and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,hsl(var(--primary)/0.14),transparent_60%)] animate-login-enter-glow" />
      <div className="w-full max-w-sm animate-login-enter-card relative z-10">
        <div className="bg-card/95 border border-border rounded-3xl p-6 shadow-elevated backdrop-blur-sm">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/finpilot-logo.png"
              alt="FINPilot"
              className="h-16 w-auto object-contain animate-float-soft"
            />
            <h1 className="text-2xl font-bold mt-4 text-foreground">
              {mode === "existing" ? t("login.signIn") : t("login.createAccount")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {mode === "existing"
                ? t("login.existingSubtitle")
                : t("login.newSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              className={`btn-smooth rounded-xl px-3 py-2 text-sm font-medium border ${
                mode === "existing"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border"
              }`}
              onClick={() => {
                setMode("existing");
                setError("");
              }}
            >
              {t("login.existingUser")}
            </button>
            <button
              type="button"
              className={`btn-smooth rounded-xl px-3 py-2 text-sm font-medium border ${
                mode === "new"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border"
              }`}
              onClick={() => {
                setMode("new");
                setError("");
              }}
            >
              {t("login.newUser")}
            </button>
          </div>

          <div className="space-y-4">
            {mode === "new" && (
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {t("login.name")}
                </label>
                <Input
                  type="text"
                  placeholder={t("login.enterName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {t("login.email")}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder={t("login.enterEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {t("login.password")}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  placeholder={t("login.enterPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-risk-high mt-3 animate-fade-in">{error}</p>
          )}

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-5 h-11 rounded-xl shadow-hero"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === "existing" ? t("login.signingIn") : t("login.creating")}
              </>
            ) : (
              mode === "existing" ? t("login.signIn") : t("login.createAccount")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
