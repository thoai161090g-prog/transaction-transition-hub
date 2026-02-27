import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery token in URL
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Also listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Lỗi", description: "Mật khẩu không khớp", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Thành công!", description: "Mật khẩu đã được đặt lại." });
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(180deg, #a855f7 0%, #ec4899 30%, #f97316 60%, #a855f7 100%)"
    }}>
      <div className="w-full max-w-md rounded-3xl p-6 space-y-5" style={{
        background: "rgba(20, 25, 45, 0.95)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div className="text-center">
          <h1 className="text-2xl font-black text-white">🔐 Đặt lại mật khẩu</h1>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Nhập mật khẩu mới</p>
        </div>

        {!ready ? (
          <p className="text-center text-sm" style={{ color: "#ffd700" }}>Đang xác thực... Vui lòng đợi.</p>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mật khẩu mới"
                className="w-full pl-12 pr-12 py-3.5 rounded-xl text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Xác nhận mật khẩu"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            {confirmPassword.length > 0 && (
              <p className="text-xs font-bold" style={{ color: password === confirmPassword ? "#00ff88" : "#ff4444" }}>
                {password === confirmPassword ? "✅ Mật khẩu khớp" : "❌ Không khớp"}
              </p>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #f97316, #ec4899, #a855f7)", color: "#fff" }}>
              {loading ? "Đang xử lý..." : "✅ Đặt lại mật khẩu"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
