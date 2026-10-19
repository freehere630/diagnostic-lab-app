import { onInventoryUpdate } from "../utils/inventoryEvents";
import React, { useState, useEffect } from "react";
import {
  ArrowLeft, CheckCircle2, XCircle, Truck, RefreshCw, AlertTriangle,
  Calendar, Building2, FileText, PackagePlus,
} from "lucide-react";
import {
  getPurchaseOrderById, approvePurchaseOrder, cancelPurchaseOrder,
  getGoodsReceivedNotes, getInventoryLocations,
} from "../services/inventoryApi";

const STATUS_STYLE = {
  draft:              "bg-slate-100 text-slate-700 border-slate-200",
  pending_approval:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:           "bg-blue-50 text-blue-700 border-blue-200",
  partially_received: "bg-purple-50 text-purple-700 border-purple-200",
  received:           "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:          "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_LABEL = {
  draft:              "Draft",
  pending_approval:   "Pending Approval",
  approved:           "Approved",
  partially_received: "Partially Received",
  received:           "Fully Received",
  cancelled:          "Cancelled",
};

export default function PurchaseOrderDetail({ poId, onBack, onReceive }) {
  const [po, setPo] = useState(null);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, g] = await Promise.all([
        getPurchaseOrderById(poId),
        getGoodsReceivedNotes({ poId }),
      ]);
      setPo(p);
      setGrns(g);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [poId]);
useEffect(() => {
    const unsub = onInventoryUpdate(load);
    return () => unsub();
  }, []);
  const handleApprove = async () => {
    if (!window.confirm("Approve this purchase order?")) return;
    setBusy(true);
    try {
      await approvePurchaseOrder(poId);
      await load();
    } catch (e) {
      alert("Approve failed: " + e.message);
    } finally { setBusy(false); }
  };

  const handleCancel = async () => {
    const reason = window.prompt("Reason for cancelling:");
    if (reason === null) return;
    setBusy(true);
    try {
      await cancelPurchaseOrder(poId, reason);
      await load();
    } catch (e) {
      alert("Cancel failed: " + e.message);
    } finally { setBusy(false); }
  };

  if (loading || !po) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading purchase order…
      </div>
    );
  }

  const canApprove = po.status === "draft" || po.status === "pending_approval";
  const canReceive = po.status === "approved" || po.status === "partially_received";
  const canCancel  = !["received", "cancelled"].includes(po.status);

  const totalReceivedValue = grns.reduce((s, g) => s + (parseFloat(g.total_amount) || 0), 0);

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">

      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-sm text-slate-900 font-mono">{po.po_number}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${STATUS_STYLE[po.status] || STATUS_STYLE.draft}`}>
                  {STATUS_LABEL[po.status] || po.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Created {new Date(po.created_at).toLocaleString("en-GB")}
                {po.approved_at && ` · Approved ${new Date(po.approved_at).toLocaleString("en-GB")}`}
                {po.cancelled_at && ` · Cancelled ${new Date(po.cancelled_at).toLocaleString("en-GB")}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={load}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={busy}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold disabled:opacity-60"
              >
                Cancel PO
              </button>
            )}
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={busy}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
            )}
            {canReceive && (
              <button
                onClick={() => onReceive?.(po.id)}
                disabled={busy}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 disabled:opacity-60"
              >
                <PackagePlus className="w-3.5 h-3.5" /> Receive Against PO
              </button>
            )}
          </div>
        </div>

        {po.cancel_reason && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-800">
            <b>Cancel reason:</b> {po.cancel_reason}
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <InfoCard icon={Building2} label="Supplier" value={po.supplier?.name || "—"}
                    sub={po.supplier?.contact_person} />
          <InfoCard icon={Calendar} label="Order Date" value={po.order_date} mono />
          <InfoCard icon={Calendar} label="Expected" value={po.expected_date || "—"} mono />
          <InfoCard icon={FileText} label="Invoice"
                    value={grns.find((g) => g.invoice_number)?.invoice_number || "—"} />
        </div>

        {po.notes && (
          <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2.5">
            <b>Notes:</b> {po.notes}
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wide text-slate-800">Order Lines</span>
          <span className="text-[10px] text-slate-400">{po.items?.length || 0} line(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold text-[10px] uppercase">
                <th className="py-2 px-3">Item</th>
                <th className="py-2 px-3 text-right">Ordered</th>
                <th className="py-2 px-3 text-right">Received</th>
                <th className="py-2 px-3 text-right">Remaining</th>
                <th className="py-2 px-3 text-right">Unit Cost</th>
                <th className="py-2 px-3 text-right">Line Total</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(po.items || []).map((l) => {
                const ordered = parseFloat(l.qty_ordered) || 0;
                const received = parseFloat(l.qty_received) || 0;
                const remaining = Math.max(0, ordered - received);
                const isOver = received > ordered;
                const isDone = received >= ordered;
                const isPartial = received > 0 && !isDone;

                return (
                  <tr key={l.id} className={isDone ? "bg-emerald-50/30" : isPartial ? "bg-purple-50/20" : ""}>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900 truncate max-w-[240px]">{l.item?.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{l.item?.code}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {ordered.toLocaleString()} <span className="text-slate-400 text-[10px]">{l.item?.uom}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {received.toLocaleString()}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${remaining > 0 ? "text-amber-700" : "text-slate-400"}`}>
                      {remaining.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      ৳{parseFloat(l.unit_cost).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      ৳{parseFloat(l.line_total).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      {isOver ? (
                        <span className="text-[10px] font-bold text-amber-700 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Over-delivered
                        </span>
                      ) : isDone ? (
                        <span className="text-[10px] font-bold text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      ) : isPartial ? (
                        <span className="text-[10px] font-bold text-purple-700">Partial</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-100 p-3 flex justify-end">
          <table className="text-xs">
            <tbody>
              <tr><td className="px-3 py-0.5 text-slate-500">Subtotal</td>
                  <td className="px-3 py-0.5 text-right font-mono font-semibold">৳{parseFloat(po.subtotal).toLocaleString()}</td></tr>
              <tr><td className="px-3 py-0.5 text-slate-500">Tax</td>
                  <td className="px-3 py-0.5 text-right font-mono font-semibold">৳{parseFloat(po.tax_amount).toLocaleString()}</td></tr>
              <tr className="border-t border-slate-200">
                <td className="px-3 py-1 font-bold">Total</td>
                <td className="px-3 py-1 text-right font-mono font-bold text-blue-700 text-sm">
                  ৳{parseFloat(po.total_amount).toLocaleString()}
                </td>
              </tr>
              <tr><td className="px-3 py-0.5 text-slate-500">Received so far</td>
                  <td className="px-3 py-0.5 text-right font-mono font-semibold text-emerald-700">
                    ৳{totalReceivedValue.toLocaleString()}
                  </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* GRN history */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600" /> Receipt History ({grns.length})
          </span>
        </div>

        {grns.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            No receipts yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {grns.map((g) => (
              <li key={g.id} className="px-3 py-2 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xs font-bold text-slate-800">{g.grn_number}</div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(g.received_at).toLocaleString("en-GB")} · {g.location?.name}
                    {g.invoice_number && ` · Inv ${g.invoice_number}`}
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-sm text-slate-800">
                  ৳{parseFloat(g.total_amount).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, sub, mono }) {
  return (
    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`text-xs font-bold text-slate-800 truncate ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </div>
      {sub && <div className="text-[10px] text-slate-500 truncate">{sub}</div>}
    </div>
  );
}