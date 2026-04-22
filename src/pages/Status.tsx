import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Loader2, ArrowLeft, RefreshCw, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Payment = {
  order_id: string;
  email: string;
  amount: number;
  status: string;
  utr: string | null;
  created_at: string;
  updated_at: string;
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "SUCCESS")
    return <CheckCircle2 className="w-16 h-16 text-success" strokeWidth={1.5} />;
  if (status === "FAILED" || status === "EXPIRED")
    return <XCircle className="w-16 h-16 text-destructive" strokeWidth={1.5} />;
  return <Clock className="w-16 h-16 text-warning animate-pulse" strokeWidth={1.5} />;
};

const StatusPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(
    async (showSpinner = false) => {
      if (!orderId) return;
      if (showSpinner) setRefreshing(true);
      try {
        const { data } = await supabase.functions.invoke("check-payment", {
          body: { order_id: orderId },
        });
        if (data?.payment) setPayment(data.payment);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Order not found</h2>
          <p className="text-muted-foreground mb-4">We couldn't find this payment.</p>
          <Link to="/">
            <Button>Back home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const status = payment.status.toUpperCase();
  const isPending = status === "PENDING";

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <Card className="p-8 md:p-12 bg-gradient-card shadow-elevated text-center">
          <div className="flex justify-center mb-6">
            <StatusIcon status={status} />
          </div>

          <Badge
            variant="outline"
            className={`mb-3 ${
              status === "SUCCESS"
                ? "border-success text-success"
                : status === "FAILED" || status === "EXPIRED"
                  ? "border-destructive text-destructive"
                  : "border-warning text-warning"
            }`}
          >
            {status}
          </Badge>

          <h1 className="text-3xl font-bold mb-2">
            {status === "SUCCESS"
              ? "Payment Successful 🎉"
              : status === "FAILED"
                ? "Payment Failed"
                : status === "EXPIRED"
                  ? "Payment Expired"
                  : "Awaiting Confirmation"}
          </h1>

          <p className="text-3xl font-extrabold text-gradient mb-6 font-mono">
            ₹{Number(payment.amount).toLocaleString("en-IN")}
          </p>

          {isPending && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-foreground mb-1">
                ⏳ Confirmation may take 5 minutes to 1 hour
              </p>
              <p className="text-xs text-muted-foreground">
                If you've completed the UPI payment, please wait. We'll auto-update this page when
                the bank confirms. You can safely close this tab — your payment is being tracked.
              </p>
            </div>
          )}

          <div className="text-left bg-muted/50 rounded-xl p-4 space-y-3 mb-6">
            <Row label="Order ID" value={payment.order_id} onCopy={() => copy(payment.order_id)} />
            <Row label="Email" value={payment.email} />
            {payment.utr && (
              <Row label="UTR" value={payment.utr} onCopy={() => copy(payment.utr!)} />
            )}
            <Row
              label="Updated"
              value={new Date(payment.updated_at).toLocaleString("en-IN")}
            />
          </div>

          <Button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            variant="outline"
            className="w-full h-12"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh status
          </Button>
        </Card>
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
    <div className="flex items-center gap-2 font-mono text-sm">
      <span className="truncate max-w-[200px]">{value}</span>
      {onCopy && (
        <button onClick={onCopy} className="text-muted-foreground hover:text-foreground">
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);

export default StatusPage;
