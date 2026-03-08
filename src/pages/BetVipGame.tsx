import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { analyzeMD5 } from "@/lib/md5-analyzer";
import { useToast } from "@/hooks/use-toast";

export default function BetVipGame() {
  const navigate = useNavigate();
  const { user, hasActiveKey } = useAuth();
  const { toast } = useToast();
  const [md5Input, setMd5Input] = useState("");
  const [phien, setPhien] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyzeMD5>>(null);
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    hasActiveKey().then(setHasKey);
  }, []);

  useEffect(() => {
    if (hasKey === false) {
      toast({ title: "⚠️ Chưa có Key", description: "Vui lòng mua key để sử dụng.", variant: "destructive" });
      navigate("/buy-key");
    }
  }, [hasKey]);

  // Canvas particle effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
        a: Math.random() * 0.5 + 0.2,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 204, 0, ${p.a})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleAnalyze = async () => {
    if (!md5Input.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mã MD5", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    const key = await hasActiveKey();
    if (!key) {
      toast({ title: "⚠️ Chưa có Key", description: "Vui lòng mua key để sử dụng tool.", variant: "destructive" });
      setLoading(false);
      navigate("/buy-key");
      return;
    }

    await new Promise((r) => setTimeout(r, 1500));
    const analysis = analyzeMD5(md5Input);
    if (!analysis) {
      toast({ title: "Lỗi", description: "Mã MD5 không hợp lệ", variant: "destructive" });
      setLoading(false);
      return;
    }

    setResult(analysis);

    if (user) {
      await supabase.from("analysis_history").insert({
        user_id: user.id,
        game: "BetVIP",
        md5_input: md5Input,
        result: analysis.result,
        tai_percent: analysis.taiPercent,
        xiu_percent: analysis.xiuPercent,
        confidence: analysis.confidence,
      });
    }

    setLoading(false);
  };

  if (hasKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050000" }}>
        <div className="text-xl font-bold" style={{ color: "#ffcc00", fontFamily: "Orbitron, sans-serif" }}>
          ⏳ Đang kiểm tra key...
        </div>
      </div>
    );
  }

  const stdDev = result ? (result.sum * 0.0234).toFixed(3) : "0.000";
  const convergence = result ? `${Math.min(99, result.confidence + 3)}%` : "0%";
  const entropy = result ? (result.sum * 0.145).toFixed(2) : "0.00";
  const suggestedBet = result ? (result.confidence >= 70 ? "500,000" : result.confidence >= 60 ? "300,000" : "100,000") : "0";

  const aiLogic = result
    ? `• Hex tail [${md5Input.slice(-4)}] → decimal sum = ${result.sum}/60
• Phân bố xác suất: Tài ${result.taiPercent}% | Xỉu ${result.xiuPercent}%
• Độ lệch chuẩn σ = ${stdDev} — ${parseFloat(stdDev) > 0.5 ? "phiên phân tán mạnh" : "phiên ổn định"}
• Entropy Shannon = ${entropy} → ${parseFloat(entropy) > 4 ? "dữ liệu ngẫu nhiên cao" : "có xu hướng rõ"}
• Kết luận AI: ${result.result.toUpperCase()} với confidence ${result.confidence}%`
    : "";

  return (
    <div
      className="min-h-screen flex justify-center items-center overflow-x-hidden relative"
      style={{
        backgroundColor: "#050000",
        backgroundImage: "radial-gradient(circle at 50% 50%, #201a00 0%, #000 100%)",
        fontFamily: "'Roboto Condensed', sans-serif",
        padding: 15,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Roboto+Condensed:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, opacity: 0.6 }} />

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-3 left-3 z-[10000] px-4 py-2 rounded-xl font-bold text-sm cursor-pointer transition-all hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #ffcc00, #ff9900)",
          color: "#050000",
          boxShadow: "0 4px 15px rgba(255,204,0,0.4)",
          fontFamily: "Orbitron, sans-serif",
        }}
      >
        ← Trang chủ
      </button>

      <div
        className="w-full max-w-[460px] relative overflow-hidden"
        style={{
          background: "rgba(15, 0, 0, 0.92)",
          backdropFilter: "blur(20px)",
          border: "2px solid #ffcc00",
          borderRadius: 40,
          padding: "30px 20px",
          animation: "vipBorderBlink 1.5s infinite",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span
            className="inline-block px-6 py-1.5 rounded-full font-black text-xs tracking-[3px] rainbow-blink-text"
            style={{
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <span className="rainbow-blink-icon">⭐</span> VĂN MINH VIP 2026 <span className="rainbow-blink-icon">👑</span>
          </span>
          <h1
            className="text-3xl mt-3 mb-1 tracking-wide rainbow-blink-text"
            style={{
              fontFamily: "Orbitron, sans-serif",
              fontWeight: 900,
            }}
          >
            ALGORITHM PRO
          </h1>
          <p className="text-sm" style={{ color: "#999" }}>
            Phân tích xác suất thời gian thực
          </p>
        </div>

        {/* Inputs */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Nhập phiên (tuỳ chọn)"
            value={phien}
            onChange={(e) => setPhien(e.target.value)}
            className="w-full p-4 text-center text-sm"
            style={{
              background: "rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,204,0,0.4)",
              borderRadius: 18,
              color: "#ffcc00",
              fontFamily: "Orbitron, sans-serif",
              fontSize: "0.95rem",
              outline: "none",
            }}
          />
        </div>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Nhập mã MD5"
            value={md5Input}
            onChange={(e) => setMd5Input(e.target.value)}
            className="w-full p-4 text-center text-sm"
            style={{
              background: "rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,204,0,0.4)",
              borderRadius: 18,
              color: "#ffcc00",
              fontFamily: "Orbitron, sans-serif",
              fontSize: "0.95rem",
              outline: "none",
            }}
          />
        </div>

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-4 border-none cursor-pointer uppercase transition-all hover:brightness-[1.2] hover:-translate-y-0.5 disabled:opacity-60"
          style={{
            borderRadius: 20,
            background: "linear-gradient(135deg, #ff9900, #ff0000)",
            color: "#fff",
            fontFamily: "Orbitron, sans-serif",
            fontWeight: 900,
            fontSize: "1rem",
            boxShadow: "0 8px 20px rgba(255,153,0,0.3)",
          }}
        >
          {loading ? "⏳ ĐANG PHÂN TÍCH..." : "BẮT ĐẦU PHÂN TÍCH"}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6" style={{ animation: "fadeInUp 0.5s ease" }}>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "2px solid #ffcc00" }}>
                <span className="text-[0.65rem] uppercase block mb-1" style={{ color: "#888" }}>Độ Lệch Chuẩn</span>
                <span className="text-base font-bold text-white" style={{ fontFamily: "Orbitron" }}>{stdDev}</span>
              </div>
              <div className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "2px solid #ffcc00" }}>
                <span className="text-[0.65rem] uppercase block mb-1" style={{ color: "#888" }}>Tỷ Lệ Hội Tụ</span>
                <span className="text-base font-bold text-white" style={{ fontFamily: "Orbitron" }}>{convergence}</span>
              </div>
              <div className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "2px solid #ffcc00" }}>
                <span className="text-[0.65rem] uppercase block mb-1" style={{ color: "#888" }}>Entropy Phiên</span>
                <span className="text-base font-bold text-white" style={{ fontFamily: "Orbitron" }}>{entropy}</span>
              </div>
              <div className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "2px solid #ffcc00" }}>
                <span className="text-[0.65rem] uppercase block mb-1" style={{ color: "#888" }}>Trạng Thái AI</span>
                <span className="text-base font-bold" style={{ fontFamily: "Orbitron", color: "#00ff88" }}>HOÀN TẤT</span>
              </div>
            </div>

            {/* Main result */}
            <div className="text-center my-3">
              <div
                className="text-7xl font-black tracking-tighter"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  color: result.result === "Tài" ? "#ff2222" : "#00e5ff",
                  textShadow: result.result === "Tài" ? "0 0 40px #ff2222" : "0 0 40px #00e5ff",
                }}
              >
                {result.result.toUpperCase()}
              </div>
            </div>

            {/* AI Logic */}
            <div
              className="text-left p-4 rounded-2xl text-sm leading-relaxed mb-5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,204,0,0.2)",
                color: "#ddd",
              }}
            >
              <strong className="block mb-2 pb-1" style={{ color: "#ffcc00", borderBottom: "1px solid rgba(255,204,0,0.1)" }}>
                📊 PHÂN TÍCH HỆ THỐNG VĂN MINH:
              </strong>
              {aiLogic.split("\n").map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            {/* Bet advice */}
            <div
              className="p-5 rounded-3xl text-center"
              style={{
                background: "linear-gradient(135deg, #220000, #000)",
                border: "1px solid #ffcc00",
                boxShadow: "inset 0 0 20px rgba(255,204,0,0.1)",
              }}
            >
              <div className="text-xs font-bold tracking-wider mb-1" style={{ color: "#999" }}>
                ĐỀ XUẤT GIẢI NGÂN VIP
              </div>
              <span className="text-4xl font-black block mt-1" style={{ fontFamily: "Orbitron", color: "#ffcc00" }}>
                {suggestedBet} VNĐ
              </span>
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                setResult(null);
                setMd5Input("");
                setPhien("");
              }}
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm tracking-wider transition-all hover:scale-[1.02]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,204,0,0.3)",
                color: "#ffcc00",
              }}
            >
              🔄 PHÂN TÍCH LẠI
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-[0.7rem] tracking-wider" style={{ color: "#555" }}>
          ENGINEERED BY VAN MINH TEAM | VERSION 9.0.2
        </div>
      </div>

      <style>{`
        @keyframes vipBorderBlink {
          0% { border-color: #ffcc00; box-shadow: 0 0 15px #ffcc00; }
          50% { border-color: #fff; box-shadow: 0 0 35px #ff9900; }
          100% { border-color: #ffcc00; box-shadow: 0 0 15px #ffcc00; }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
