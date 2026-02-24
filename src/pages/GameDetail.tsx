import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GAMES, analyzeMD5 } from "@/lib/md5-analyzer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasActiveKey } = useAuth();
  const { toast } = useToast();
  const [md5Input, setMd5Input] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const game = GAMES.find((g) => g.id === id);
  if (!game) return <div className="min-h-screen flex items-center justify-center text-white">Game không tồn tại</div>;

  const handleAnalyze = async () => {
    if (!md5Input.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mã MD5", variant: "destructive" });
      return;
    }

    setLoading(true);

    const hasKey = await hasActiveKey();
    if (!hasKey) {
      toast({ title: "⚠️ Chưa có Key", description: "Vui lòng mua key để sử dụng tool.", variant: "destructive" });
      setLoading(false);
      navigate("/buy-key");
      return;
    }

    const analysis = analyzeMD5(md5Input);
    if (!analysis) {
      toast({ title: "Lỗi", description: "Mã MD5 không hợp lệ", variant: "destructive" });
      setLoading(false);
      return;
    }

    setResult(analysis);

    // Save to history
    if (user) {
      await supabase.from("analysis_history").insert({
        user_id: user.id,
        game: game.name,
        md5_input: md5Input,
        result: analysis.result,
        tai_percent: analysis.taiPercent,
        xiu_percent: analysis.xiuPercent,
        confidence: analysis.confidence,
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #c0392b 0%, #e74c3c 20%, #d35400 50%, #1a0a00 100%)"
    }}>
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,200,50,0.3) 0%, transparent 70%)"
      }} />

      <header className="relative z-10 py-3 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm font-bold" style={{ color: "#ffd700" }}>← Trang chủ</button>
          <h1 className="text-lg font-black" style={{
            background: "linear-gradient(135deg, #ffae00, #ffd700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>{game.icon} {game.name}</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Input Section */}
        <div className="rounded-2xl p-[2px]" style={{ background: "linear-gradient(135deg, #ffae00, #ff8c00, #ffae00)" }}>
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,248,230,0.95)" }}>
            <h2 className="text-center font-black text-lg" style={{ color: "#c0392b" }}>🔍 Phân Tích MD5</h2>
            <Input
              placeholder="Nhập mã MD5..."
              value={md5Input}
              onChange={(e) => setMd5Input(e.target.value)}
              className="font-mono text-center border-2"
              style={{ borderColor: "rgba(255,174,0,0.4)" }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-4 rounded-xl font-black text-base tracking-wider disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #ff8c00, #ffae00, #ffd000)",
                color: "#1a0a00",
                boxShadow: "0 4px 20px rgba(255,174,0,0.5)",
              }}
            >
              {loading ? "Đang phân tích..." : "🚀 PHÂN TÍCH NGAY"}
            </button>
          </div>
        </div>

        {/* Result Section */}
        {result && (
          <div className="rounded-2xl p-[2px]" style={{
            background: "linear-gradient(135deg, #ffae00, #ff8c00, #ffae00)",
            animation: "fadeIn 0.4s ease-out",
          }}>
            <div className="rounded-2xl p-5 text-center space-y-4" style={{ background: "rgba(255,248,230,0.95)" }}>
              <h3 className="font-black text-lg" style={{ color: "#1a0a00" }}>📊 KẾT QUẢ</h3>
              <div className="text-5xl font-black" style={{ color: result.result === "Tài" ? "#ff8c00" : "#00c3ff" }}>
                {result.result === "Tài" ? "🔥" : "❄️"} {result.result.toUpperCase()}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,140,0,0.15)" }}>
                  <div className="text-sm font-bold" style={{ color: "#ff8c00" }}>Tài</div>
                  <div className="text-2xl font-black" style={{ color: "#1a0a00" }}>{result.taiPercent}%</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,195,255,0.15)" }}>
                  <div className="text-sm font-bold" style={{ color: "#00c3ff" }}>Xỉu</div>
                  <div className="text-2xl font-black" style={{ color: "#1a0a00" }}>{result.xiuPercent}%</div>
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(0,255,136,0.1)" }}>
                <span className="text-sm" style={{ color: "#666" }}>Độ tin cậy: </span>
                <span className="font-black text-lg" style={{ color: "#00ff88" }}>{result.confidence}%</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`@keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
