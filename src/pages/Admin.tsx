import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, LogOut, RefreshCw, Search, Wallet, CheckCircle2, Clock, XCircle, IndianRupee } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PASSWORD_KEY = "admin_pwd";

type Payment = {
  id: string;
  order_id: string;
  email: string;
  customer_mobile: string;
  amount: number;
  status: string;
  utr: string | null;
  created_at: string;
  updated_at: string;
  payment_url: string | null;
};

type Stats = {
  total: number;
  success: number;
  pending: number;
  failed: number;
  sumSuccess: number;
  sumAll: number;
};

const Admin = () => {
  const [password, setPassword] = useState(sessionStorage.getItem(PASSWORD_KEY) || "");
  const [authed, setAuthed] = useState(!!sessionStorage.getItem(PASSWORD_KEY));
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${SUPABASE_URL}/functions/v1/admin-payments`);
      if (filter !== "ALL") url.searchParams.set("status", filter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString(), {
        headers: { "x-admin-password": password },
      });
      if (res.status === 401) {
        toast({ title: "Wrong password", variant: "destructive" });
        sessionStorage.removeItem(PASSWORD_KEY);
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setPayments(data.payments || []);
      setStats(data.stats || null);
    } catch (e) {
      toast({ title: "Failed to load", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filter, search, password]);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authed) return;
    const i = setInterval(fetchData, 30000);
    return () => clearInterval(i);
  }, [authed, fetchData]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full bg-gradient-card shadow-elevated">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Lock className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Admin Access</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter the admin password to view payments
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!password) return;
              sessionStorage.setItem(PASSWORD_KEY, password);
              setAuthed(true);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="pwd">Password</Label>
              <Input
                id="pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 mt-2"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-primary shadow-glow"
            >
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Payments dashboard</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem(PASSWORD_KEY);
              setAuthed(false);
              setPassword("");
            }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Wallet}
              label="Total payments"
              value={stats.total.toString()}
              tone="primary"
            />
            <StatCard
              icon={CheckCircle2}
              label="Successful"
              value={stats.success.toString()}
              tone="success"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={stats.pending.toString()}
              tone="warning"
            />
            <StatCard
              icon={IndianRupee}
              label="Collected"
              value={`₹${stats.sumSuccess.toLocaleString("en-IN")}`}
              tone="primary"
            />
          </div>
        )}

        {/* Filters */}
        <Card className="p-4 bg-gradient-card">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, order ID, UTR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="md:w-48 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchData} disabled={loading} variant="outline" className="h-11">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>UTR</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.order_id}</TableCell>
                      <TableCell className="text-sm">{p.email}</TableCell>
                      <TableCell className="font-mono text-xs">{p.customer_mobile}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        ₹{Number(p.amount).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.utr || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(p.created_at).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "primary" | "success" | "warning";
}) => {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-primary/10 text-primary";
  return (
    <Card className="p-5 bg-gradient-card">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold font-mono">{value}</p>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toUpperCase();
  if (s === "SUCCESS")
    return (
      <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Success
      </Badge>
    );
  if (s === "FAILED" || s === "EXPIRED")
    return (
      <Badge variant="outline" className="border-destructive text-destructive">
        <XCircle className="w-3 h-3 mr-1" /> {s}
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-warning text-warning">
      <Clock className="w-3 h-3 mr-1" /> Pending
    </Badge>
  );
};

export default Admin;
