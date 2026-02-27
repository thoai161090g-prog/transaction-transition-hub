import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KEY_PACKAGES, formatVND } from "@/lib/md5-analyzer";
import { useToast } from "@/hooks/use-toast";
import Fireworks from "@/components/Fireworks";
import { Star, Sun, Cloud, Calendar, CalendarCheck, Infinity } from "lucide-react";

const PKG_META: Record<string, { icon: React.ReactNode; iconBg: string; subtitle: string; badge?: string; badgeColor?: string; features: string[]; suffix: string }> = {
  "1day": {
    icon: <Sun className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #3b82f6, #2563eb)",
    subtitle: "Có thời hạn",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói"],
    suffix: "/gói"
  },
  "3days": {
    icon: <Cloud className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    subtitle: "Có thời hạn",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói"],
    suffix: "/gói"
  },
  "1week": {
    icon: <Star className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #ec4899, #be185d)",
    subtitle: "Có thời hạn",
    badge: "⭐ Phổ biến nhất",
    badgeColor: "linear-gradient(135deg, #ec4899, #f97316)",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói"],
    suffix: "/gói"
  },
  "1month": {
    icon: <Calendar className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #f97316, #ea580c)",
    subtitle: "Có thời hạn",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói"],
    suffix: "/gói"
  },
  "lifetime": {
    icon: <Infinity className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #ef4444, #dc2626)",
    subtitle: "Một lần duy nhất",
    badge: "💎 VIP TRỌN ĐỜI",
    badgeColor: "linear-gradient(135deg, #ffd700, #f97316)",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói", "Không giới hạn thiết bị", "Cập nhật trọn đời"],
    suffix: "/vĩnh viễn"
  },
};

export default function BuyKey() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const pkg = KEY_PACKAGES.find((p) => p.id === selectedPkg);
  const transferContent = user ? `KEY_${user.id.slice(0, 8).toUpperCase()}_${selectedPkg?.toUpperCase()}` : "";

  const handleConfirmPayment = async () => {
    if (!user || !pkg) return;
    setConfirming(true);

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      package: pkg.id,
      amount: pkg.price,
      status: "pending",
      transfer_content: transferContent,
    });

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Đã gửi yêu cầu!", description: "Vui lòng chờ Admin duyệt và kích hoạt key cho bạn." });
      try {
        await supabase.functions.invoke("telegram-notify", {
          body: { email: user.email, amount: pkg.price, package_name: pkg.label, transfer_content: transferContent, status: "pending" },
        });
      } catch (e) {
        console.error("Telegram notify failed:", e);
      }
    }
    setSelectedPkg(null);
    setConfirming(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)"
    }}>
      <header className="relative z-10 py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm font-bold" style={{ color: "#6b7280" }}>← Trang chủ</button>
          <h1 className="text-lg font-black" style={{ color: "#1f2937" }}>👑 Văn Minh</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-2">
        {!selectedPkg ? (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-black" style={{ color: "#4f46e5" }}>Chọn gói Key Premium</h2>
              <p className="text-sm" style={{ color: "#6b7280" }}>Mua key để sử dụng tất cả tính năng cao cấp</p>
            </div>

            <div className="space-y-4">
              {KEY_PACKAGES.map((p) => {
                const meta = PKG_META[p.id];
                return (
                  <div key={p.id} className="relative">
                    {meta?.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{
                        background: meta.badgeColor,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
                      }}>
                        {meta.badge}
                      </div>
                    )}
                    <div
                      className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        background: "#fff",
                        boxShadow: "0 2px 15px rgba(0,0,0,0.06)",
                        border: meta?.badge ? "2px solid rgba(236,72,153,0.3)" : "1px solid rgba(0,0,0,0.06)"
                      }}
                      onClick={() => setSelectedPkg(p.id)}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: meta?.iconBg }}>
                          {meta?.icon}
                        </div>
                        <div>
                          <h3 className="font-black text-lg" style={{ color: "#1f2937" }}>{p.label}</h3>
                          <p className="text-xs" style={{ color: "#9ca3af" }}>{meta?.subtitle}</p>
                        </div>
                      </div>

                      <p className="text-3xl font-black mb-4" style={{ color: "#1f2937" }}>
                        {formatVND(p.price)}
                        <span className="text-sm font-normal" style={{ color: "#9ca3af" }}> {meta?.suffix}</span>
                      </p>

                      <div className="space-y-2.5">
                        {meta?.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-sm" style={{ color: "#4b5563" }}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: "#22c55e" }}>✓</div>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      <button className="w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all" style={{
                        background: "linear-gradient(135deg, #f97316, #ffd700)",
                        color: "#1a0a00",
                      }}>
                        Mua ngay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4" style={{ animation: "fadeIn 0.4s ease-out" }}>
            <div className="rounded-2xl p-6 space-y-4" style={{
              background: "#fff",
              boxShadow: "0 2px 15px rgba(0,0,0,0.06)",
            }}>
              <h2 className="text-center font-black text-lg" style={{ color: "#1f2937" }}>💳 Thanh Toán - Gói {pkg?.label}</h2>
              <p className="text-center text-3xl font-black" style={{ color: "#ef4444" }}>{pkg && formatVND(pkg.price)}</p>

              <div className="flex justify-center">
                <div className="rounded-xl overflow-hidden border-2 p-2" style={{ borderColor: "rgba(0,0,0,0.08)", background: "#fff" }}>
                  <img src="/images/qr-payment.jpeg" alt="QR Thanh toán" className="w-56 h-auto rounded-lg" />
                </div>
              </div>

              <div className="p-4 rounded-xl space-y-2 text-sm" style={{ background: "#f8f9fa" }}>
                <p style={{ color: "#6b7280" }}>Ngân hàng: <span className="font-bold" style={{ color: "#1f2937" }}>MSB</span></p>
                <p style={{ color: "#6b7280" }}>Chủ TK: <span className="font-bold" style={{ color: "#1f2937" }}>Nguyen Van Minh</span></p>
                <p style={{ color: "#6b7280" }}>STK: <span className="font-bold" style={{ color: "#ef4444" }}>4526032009</span></p>
                <p style={{ color: "#6b7280" }}>Nội dung CK: <span className="font-mono font-bold" style={{ color: "#ef4444" }}>{transferContent}</span></p>
              </div>

              <div className="text-center text-xs p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                ⚠️ Quét mã QR hoặc chuyển khoản, ghi đúng nội dung CK!
              </div>

              <button onClick={handleConfirmPayment} disabled={confirming}
                className="w-full py-4 rounded-xl font-black text-base tracking-wider disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #f97316, #ffd700)", color: "#1a0a00" }}>
                {confirming ? "Đang xử lý..." : "✅ Đã Chuyển Khoản - Gửi Yêu Cầu"}
              </button>

              <button onClick={() => setSelectedPkg(null)} className="w-full py-3 rounded-xl font-bold text-sm" style={{ color: "#9ca3af" }}>
                ← Quay lại chọn gói
              </button>
            </div>
          </div>
        )}

        <p className="text-center mt-6 text-xs pb-6" style={{ color: "#9ca3af" }}>
          👑 <span style={{ color: "#f97316" }}>Văn Minh Tool</span> — Hỗ trợ: <a href="mailto:mvanminh45@gmail.com" className="hover:underline" style={{ color: "#f97316" }}>mvanminh45@gmail.com</a>
        </p>
      </main>

      <style>{`@keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
