import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatVND, KEY_PACKAGES } from "@/lib/md5-analyzer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [keys, setKeys] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    const [keysRes, txRes, usersRes] = await Promise.all([
      supabase.from("license_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    setKeys(keysRes.data || []);
    setTransactions(txRes.data || []);
    setUsers(usersRes.data || []);
    setTotalRevenue((txRes.data || []).filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + t.amount, 0));
  };

  const toggleKey = async (keyId: string, currentActive: boolean) => {
    await supabase.from("license_keys").update({ is_active: !currentActive }).eq("id", keyId);
    toast({ title: currentActive ? "Đã hủy key" : "Đã kích hoạt key" });
    loadData();
  };

  const approveTransaction = async (tx: any) => {
    const pkg = KEY_PACKAGES.find((p) => p.id === tx.package);
    if (!pkg) return;

    let expiresAt: string | null = null;
    if (pkg.days) {
      const d = new Date();
      d.setDate(d.getDate() + pkg.days);
      expiresAt = d.toISOString();
    }

    const { data: keyData, error: keyError } = await supabase
      .from("license_keys")
      .insert({ user_id: tx.user_id, package: tx.package, price: tx.amount, expires_at: expiresAt })
      .select()
      .single();

    if (keyError) {
      toast({ title: "Lỗi", description: keyError.message, variant: "destructive" });
      return;
    }

    await supabase.from("transactions").update({ status: "completed", license_key_id: keyData.id }).eq("id", tx.id);
    toast({ title: "✅ Đã duyệt!", description: `Key ${pkg.label} đã được cấp cho người dùng.` });

    try {
      await supabase.functions.invoke("telegram-notify", {
        body: { email: tx.transfer_content, amount: tx.amount, package_name: pkg.label, transfer_content: tx.transfer_content, status: "completed" },
      });
    } catch (e) { console.error("Telegram notify failed:", e); }

    loadData();
  };

  const rejectTransaction = async (tx: any) => {
    await supabase.from("transactions").update({ status: "rejected" }).eq("id", tx.id);
    toast({ title: "❌ Đã từ chối giao dịch" });

    try {
      await supabase.functions.invoke("telegram-notify", {
        body: { email: tx.transfer_content, amount: tx.amount, package_name: tx.package, transfer_content: tx.transfer_content, status: "rejected" },
      });
    } catch (e) { console.error("Telegram notify failed:", e); }

    loadData();
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(180deg, #c0392b 0%, #e74c3c 20%, #d35400 50%, #1a0a00 100%)"
    }}>
      <header className="py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button variant="ghost" className="font-bold" style={{ color: "#ffd700" }} onClick={() => navigate("/")}>← Trang chủ</Button>
          <h1 className="text-xl font-bold" style={{ color: "#ffd700" }}>🔧 Quản Trị Admin</h1>
          <div />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.3)", boxShadow: "0 0 20px rgba(255,174,0,0.15)" }}>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-white/60">Tổng Doanh Thu</div>
              <div className="text-3xl font-bold" style={{ color: "#ffd700" }}>{formatVND(totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-white/60">Tổng Key</div>
              <div className="text-3xl font-bold text-white">{keys.length}</div>
            </CardContent>
          </Card>
          <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-white/60">Tổng Người Dùng</div>
              <div className="text-3xl font-bold text-white">{users.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="keys">
          <TabsList className="w-full" style={{ background: "rgba(26,10,0,0.8)" }}>
            <TabsTrigger value="keys" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">🔑 Key</TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">💰 Giao Dịch</TabsTrigger>
            <TabsTrigger value="users" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">👥 Người Dùng</TabsTrigger>
          </TabsList>

          <TabsContent value="keys">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead className="text-white/60">User ID</TableHead><TableHead className="text-white/60">Key</TableHead><TableHead className="text-white/60">Gói</TableHead><TableHead className="text-white/60">Giá</TableHead><TableHead className="text-white/60">Hết hạn</TableHead><TableHead className="text-white/60">Trạng thái</TableHead><TableHead className="text-white/60">Hành động</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-mono text-xs text-white/80">{k.user_id.slice(0, 8)}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{k.key_string.slice(0, 12)}...</TableCell>
                        <TableCell className="text-white/80">{k.package}</TableCell>
                        <TableCell className="text-white/80">{formatVND(k.price)}</TableCell>
                        <TableCell className="text-white/80">{k.expires_at ? new Date(k.expires_at).toLocaleDateString("vi-VN") : "∞"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${k.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                            {k.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant={k.is_active ? "destructive" : "default"} onClick={() => toggleKey(k.id, k.is_active)}>
                            {k.is_active ? "Hủy" : "Kích hoạt"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead className="text-white/60">User ID</TableHead><TableHead className="text-white/60">Gói</TableHead><TableHead className="text-white/60">Số tiền</TableHead><TableHead className="text-white/60">Nội dung CK</TableHead><TableHead className="text-white/60">Trạng thái</TableHead><TableHead className="text-white/60">Thời gian</TableHead><TableHead className="text-white/60">Hành động</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs text-white/80">{t.user_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-white/80">{t.package}</TableCell>
                        <TableCell className="font-bold" style={{ color: "#ffd700" }}>{formatVND(t.amount)}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{t.transfer_content}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            t.status === "completed" ? "bg-green-900 text-green-300" :
                            t.status === "rejected" ? "bg-red-900 text-red-300" :
                            "bg-yellow-900 text-yellow-300"
                          }`}>{t.status === "pending" ? "Chờ duyệt" : t.status === "completed" ? "Đã duyệt" : "Từ chối"}</span>
                        </TableCell>
                        <TableCell className="text-white/80">{new Date(t.created_at).toLocaleString("vi-VN")}</TableCell>
                        <TableCell>
                          {t.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => approveTransaction(t)}>✅ Duyệt</Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectTransaction(t)}>❌</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead className="text-white/60">Email</TableHead><TableHead className="text-white/60">User ID</TableHead><TableHead className="text-white/60">Ngày đăng ký</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-white/80">{u.email}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{u.user_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-white/80">{new Date(u.created_at).toLocaleDateString("vi-VN")}</TableCell>
                      </TableRow>
                    ))}
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
