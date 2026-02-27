import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Fireworks from "@/components/Fireworks";
import { Eye, EyeOff, LogIn, UserPlus, Mail, Lock, User, Shield, Zap, Headphones } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["Chưa nhập", "Yếu", "Trung bình", "Mạnh"][passwordStrength];
  const strengthColor = ["#666", "#ff4444", "#ffaa00", "#00ff88"][passwordStrength];
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast({ title: "Lỗi", description: "Vui lòng nhập email", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Đã gửi!", description: "Kiểm tra email để đặt lại mật khẩu." });
      setForgotMode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      toast({ title: "Lỗi", description: "Mật khẩu không khớp", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = isLogin ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      if (!isLogin) {
        toast({ title: "✅ Đăng ký thành công!", description: "Vui lòng đăng nhập." });
        setIsLogin(true);
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #a855f7 0%, #ec4899 30%, #f97316 60%, #a855f7 100%)"
    }}>
      <Fireworks />

      {/* Brand */}
      <div className="relative z-10 text-center mb-6">
        <h1 className="text-4xl font-black text-white" style={{
          textShadow: "0 4px 20px rgba(0,0,0,0.3)"
        }}>👑 Văn Minh</h1>
        <p className="text-white/80 text-sm mt-1">Một bước làm giàu</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative z-10 rounded-3xl overflow-hidden" style={{
        background: "rgba(20, 25, 45, 0.95)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setIsLogin(true)}
            className="flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all"
            style={{
              color: isLogin ? "#ffd700" : "rgba(255,255,255,0.4)",
              borderBottom: isLogin ? "3px solid #ffd700" : "3px solid transparent",
              background: isLogin ? "rgba(255,215,0,0.05)" : "transparent"
            }}
          >
            <LogIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className="flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all"
            style={{
              color: !isLogin ? "#ffd700" : "rgba(255,255,255,0.4)",
              borderBottom: !isLogin ? "3px solid #ffd700" : "3px solid transparent",
              background: !isLogin ? "rgba(255,215,0,0.05)" : "transparent"
            }}
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {forgotMode ? (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">🔑 Quên mật khẩu</h3>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Nhập email để nhận link đặt lại mật khẩu</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: "#4da6ff" }}>
                <Mail className="w-4 h-4" /> Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="Nhập email của bạn"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-base tracking-wider disabled:opacity-60 transition-all"
              style={{ background: "linear-gradient(135deg, #f97316, #ec4899, #a855f7)", color: "#fff" }}
            >
              {loading ? "Đang gửi..." : "📧 Gửi link đặt lại"}
            </button>
            <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-sm font-bold" style={{ color: "#ffd700" }}>
              ← Quay lại đăng nhập
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!isLogin && (
            <div>
              <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: "#4da6ff" }}>
                <User className="w-4 h-4" /> Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: "#4da6ff" }}>
              <Mail className="w-4 h-4" /> {isLogin ? "Email / Tên đăng nhập" : "Email"}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Nhập email"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: "#4da6ff" }}>
              <Lock className="w-4 h-4" /> Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isLogin && (
              <div className="text-right mt-1">
                <button type="button" onClick={() => setForgotMode(true)} className="text-xs font-bold" style={{ color: "#ffd700" }}>Quên mật khẩu?</button>
              </div>
            )}
            {!isLogin && (
              <div className="mt-2">
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${(passwordStrength / 3) * 100}%`,
                    background: strengthColor
                  }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Độ mạnh mật khẩu</span>
                  <span className="text-xs font-bold" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              </div>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: "#4da6ff" }}>
                <Shield className="w-4 h-4" /> Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl text-white text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className="text-xs mt-1 font-bold" style={{ color: passwordsMatch ? "#00ff88" : "#ff4444" }}>
                  {passwordsMatch ? "✅ Mật khẩu khớp" : "❌ Mật khẩu không khớp"}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base tracking-wider disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #f97316, #ec4899, #a855f7)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
            }}
          >
            {loading ? "Đang xử lý..." : isLogin ? (
              <><LogIn className="w-5 h-5" /> Đăng nhập</>
            ) : (
              <><UserPlus className="w-5 h-5" /> Đăng ký ngay</>
            )}
          </button>
        </form>
        )}

        {/* Bottom badges */}
        {isLogin && (
          <div className="flex justify-center gap-8 pb-6">
            {[
              { icon: <Zap className="w-5 h-5" />, label: "Siêu tốc", color: "#ffd700", bg: "rgba(255,215,0,0.15)" },
              { icon: <Shield className="w-5 h-5" />, label: "Bảo mật", color: "#ffd700", bg: "rgba(255,215,0,0.15)" },
              { icon: <Headphones className="w-5 h-5" />, label: "Hỗ trợ 24/7", color: "#ffd700", bg: "rgba(255,215,0,0.15)" },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: b.bg, color: b.color }}>
                  {b.icon}
                </div>
                <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
