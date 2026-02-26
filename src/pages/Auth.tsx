import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Fireworks from "@/components/Fireworks";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isLogin ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      if (!isLogin) {
        toast({ title: "Thành công", description: "Vui lòng kiểm tra email để xác nhận tài khoản." });
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #c0392b 0%, #e74c3c 20%, #d35400 50%, #1a0a00 100%)"
    }}>
      <Fireworks />
      <Card className="w-full max-w-md border-border relative z-10" style={{
        background: "rgba(26,10,0,0.92)",
        borderColor: "rgba(255,174,0,0.3)",
        boxShadow: "0 0 60px rgba(255,174,0,0.2), 0 0 120px rgba(255,69,0,0.1)",
      }}>
        <CardHeader className="text-center">
          <div className="text-5xl mb-2">👑</div>
          <h1 className="text-3xl font-black mb-1 tracking-wider" style={{
            background: "linear-gradient(135deg, #ffae00, #ffd700, #fff5a0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            filter: "drop-shadow(0 0 10px rgba(255,215,0,0.5))",
          }}>VĂN MINH TOOL</h1>
          <p className="text-xs font-bold tracking-[0.3em]" style={{ color: "#ff8c00" }}>⚡ UY TÍN • CHẤT LƯỢNG • VIP PRO ⚡</p>
          <CardTitle className="text-white/90 mt-3">{isLogin ? "Đăng Nhập" : "Đăng Ký"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
            <Input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
            <Button type="submit" disabled={loading} className="w-full font-black text-base tracking-wider" style={{
              background: "linear-gradient(135deg, #ff8c00, #ffae00, #ffd000)",
              color: "#1a0a00",
              boxShadow: "0 4px 20px rgba(255,174,0,0.5)",
            }}>
              {loading ? "Đang xử lý..." : isLogin ? "🔓 ĐĂNG NHẬP" : "📝 ĐĂNG KÝ"}
            </Button>
          </form>
          <p className="text-center mt-4 text-white/60">
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="hover:underline font-bold" style={{ color: "#ffd700" }}>
              {isLogin ? "Đăng ký" : "Đăng nhập"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
