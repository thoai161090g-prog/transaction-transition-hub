import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/lib/md5-analyzer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("license_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setKeys(data || []));
    supabase.from("analysis_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50).then(({ data }) => setAnalyses(data || []));
  }, [user]);

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(180deg, #c0392b 0%, #e74c3c 20%, #d35400 50%, #1a0a00 100%)"
    }}>
      <header className="py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="ghost" style={{ color: "#ffd700" }} onClick={() => navigate("/")}>← Trang chủ</Button>
          <h1 className="text-xl font-bold" style={{ color: "#ffd700" }}>📜 Lịch Sử</h1>
          <div />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="keys">
          <TabsList className="w-full" style={{ background: "rgba(26,10,0,0.8)" }}>
            <TabsTrigger value="keys" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">🔑 Key Đã Mua</TabsTrigger>
            <TabsTrigger value="analysis" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">🔍 Lịch Sử Phân Tích</TabsTrigger>
          </TabsList>

          <TabsContent value="keys">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white/60">Gói</TableHead><TableHead className="text-white/60">Key</TableHead><TableHead className="text-white/60">Giá</TableHead><TableHead className="text-white/60">Hết hạn</TableHead><TableHead className="text-white/60">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-semibold text-white/80">{k.package}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{k.key_string}</TableCell>
                        <TableCell className="text-white/80">{formatVND(k.price)}</TableCell>
                        <TableCell className="text-white/80">{k.expires_at ? new Date(k.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${k.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                            {k.is_active ? "Hoạt động" : "Hết hạn"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {keys.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-white/40 py-8">Chưa có key nào</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white/60">Game</TableHead><TableHead className="text-white/60">MD5</TableHead><TableHead className="text-white/60">Kết quả</TableHead><TableHead className="text-white/60">Tài/Xỉu</TableHead><TableHead className="text-white/60">Tin cậy</TableHead><TableHead className="text-white/60">Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyses.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-white/80">{a.game}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{a.md5_input.slice(0, 12)}...</TableCell>
                        <TableCell className="font-bold" style={{ color: a.result === "Tài" ? "#ffd700" : "#00c3ff" }}>{a.result}</TableCell>
                        <TableCell className="text-white/80">{a.tai_percent}% / {a.xiu_percent}%</TableCell>
                        <TableCell className="text-white/80">{a.confidence}%</TableCell>
                        <TableCell className="text-white/80">{new Date(a.created_at).toLocaleString("vi-VN")}</TableCell>
                      </TableRow>
                    ))}
                    {analyses.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-white/40 py-8">Chưa có phân tích nào</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
