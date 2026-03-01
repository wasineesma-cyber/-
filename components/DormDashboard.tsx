"use client";

import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { invoices, revenueHistory, rooms, tenants, type BillStatus, type RoomStatus } from "@/data/mockData";
import { createPromptPayPayload } from "@/utils/promptpay";

const statusMapRoom: Record<RoomStatus, { label: string; className: string }> = {
  vacant: { label: "ว่าง", className: "badge-neutral" },
  occupied: { label: "มีผู้เช่า", className: "badge-success" },
  maintenance: { label: "แจ้งซ่อม", className: "badge-warning" }
};

const statusMapBill: Record<BillStatus, { label: string; className: string }> = {
  paid: { label: "จ่ายแล้ว", className: "badge-success" },
  pending: { label: "รอชำระ", className: "badge-warning" },
  overdue: { label: "เกินกำหนด", className: "badge-danger" }
};

const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);

export default function DormDashboard() {
  const [roomQuery, setRoomQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState<"all" | RoomStatus>("all");
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | BillStatus>("all");
  const [tenantQuery, setTenantQuery] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  const [lastSync, setLastSync] = useState(() => new Date());
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((prev) => (prev + 1) % 6);
      setLastSync(new Date());
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const selectedInvoice = useMemo(
    () => invoices.find((x) => x.id === selectedInvoiceId) ?? null,
    [selectedInvoiceId]
  );

  const stats = useMemo(() => {
    const totalRevenueBase = revenueHistory.reduce((sum, x) => sum + x.amount, 0);
    const occupied = rooms.filter((x) => x.status === "occupied").length;
    const pendingBills = invoices.filter((x) => x.status !== "paid").length;
    return {
      totalRevenue: totalRevenueBase + liveTick * 350,
      occupancyRate: Math.round((occupied / rooms.length) * 100),
      tenants: tenants.length,
      pendingBills,
      lastSyncText: new Intl.DateTimeFormat("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(lastSync)
    };
  }, [lastSync, liveTick]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchFilter = roomFilter === "all" || room.status === roomFilter;
      const q = roomQuery.trim().toLowerCase();
      const matchQuery = !q || room.id.toLowerCase().includes(q) || room.tenant.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [roomFilter, roomQuery]);

  const filteredTenants = useMemo(() => {
    const q = tenantQuery.trim().toLowerCase();
    return tenants.filter((tenant) => !q || tenant.name.toLowerCase().includes(q) || tenant.room.toLowerCase().includes(q));
  }, [tenantQuery]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => invoiceFilter === "all" || invoice.status === invoiceFilter);
  }, [invoiceFilter]);

  const maxRevenue = Math.max(...revenueHistory.map((x) => x.amount));

  const saveReceiptAsImage = async () => {
    if (!receiptRef.current || !selectedInvoice) return;
    const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = `${selectedInvoice.id}-receipt.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareViaLine = () => {
    if (!selectedInvoice) return;
    const total = selectedInvoice.rent + selectedInvoice.water + selectedInvoice.electric;
    const message = `ใบแจ้งหนี้ ${selectedInvoice.id}\nผู้เช่า ${selectedInvoice.tenantName}\nห้อง ${selectedInvoice.room}\nยอดรวม ${fmt(total)} บาท\nครบกำหนด ${selectedInvoice.dueDate}`;
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="container">
      <h1>Dorm Management App</h1>
      <small>อัปเดตล่าสุด {stats.lastSyncText} (Real-time Mock Data)</small>

      <section className="section grid grid-4">
        <article className="card"><p>รายได้รวมย้อนหลัง</p><div className="metric-value">฿{fmt(stats.totalRevenue)}</div></article>
        <article className="card"><p>อัตราการเช่า</p><div className="metric-value">{stats.occupancyRate}%</div></article>
        <article className="card"><p>จำนวนผู้เช่า</p><div className="metric-value">{stats.tenants}</div></article>
        <article className="card"><p>บิลยังไม่ชำระ</p><div className="metric-value">{stats.pendingBills}</div></article>
      </section>

      <section className="section card">
        <h2>Dashboard Overview</h2>
        <div className="chart" aria-label="Monthly revenue chart">
          {revenueHistory.map((item) => (
            <div
              key={item.month}
              className="bar"
              style={{ height: `${(item.amount / maxRevenue) * 100}%` }}
              title={`฿${fmt(item.amount)}`}
            >
              <span>{item.month}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section grid grid-3">
        <article className="card">
          <h2>Rooms Management</h2>
          <div className="row wrap" style={{ marginBottom: 12 }}>
            <input placeholder="ค้นหาห้อง/ผู้เช่า" value={roomQuery} onChange={(e) => setRoomQuery(e.target.value)} />
            <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value as "all" | RoomStatus)}>
              <option value="all">ทั้งหมด</option>
              <option value="vacant">ว่าง</option>
              <option value="occupied">มีผู้เช่า</option>
              <option value="maintenance">แจ้งซ่อม</option>
            </select>
          </div>
          <table className="table">
            <thead><tr><th>ห้อง</th><th>ประเภท</th><th>ผู้เช่า</th><th>สถานะ</th></tr></thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.id}</td><td>{room.type}</td><td>{room.tenant}</td>
                  <td><span className={`badge ${statusMapRoom[room.status].className}`}>{statusMapRoom[room.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h2>Tenants Directory</h2>
          <div className="row" style={{ marginBottom: 12 }}>
            <input placeholder="ค้นหาชื่อผู้เช่า/ห้อง" value={tenantQuery} onChange={(e) => setTenantQuery(e.target.value)} />
          </div>
          <table className="table">
            <thead><tr><th>ชื่อ</th><th>ห้อง</th><th>ติดต่อ</th><th>Line</th><th>เข้าพักตั้งแต่</th></tr></thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>{tenant.name}</td><td>{tenant.room}</td><td>{tenant.contact}</td><td>{tenant.lineId}</td><td>{tenant.staySince}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <div className="row wrap">
            <h2>Billing & Invoices</h2>
            <select value={invoiceFilter} onChange={(e) => setInvoiceFilter(e.target.value as "all" | BillStatus)}>
              <option value="all">ทุกสถานะ</option>
              <option value="pending">รอชำระ</option>
              <option value="paid">จ่ายแล้ว</option>
              <option value="overdue">เกินกำหนด</option>
            </select>
          </div>
          <table className="table">
            <thead><tr><th>เลขบิล</th><th>ผู้เช่า</th><th>ยอดรวม</th><th>สถานะ</th><th></th></tr></thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const total = invoice.rent + invoice.water + invoice.electric;
                const canOpen = invoice.status === "pending";
                return (
                  <tr key={invoice.id}>
                    <td>{invoice.id}</td>
                    <td>{invoice.tenantName}</td>
                    <td>฿{fmt(total)}</td>
                    <td><span className={`badge ${statusMapBill[invoice.status].className}`}>{statusMapBill[invoice.status].label}</span></td>
                    <td>{canOpen ? <button className="ghost" onClick={() => setSelectedInvoiceId(invoice.id)}>ดูบิล</button> : <small>-</small>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>
      </section>

      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoiceId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <h3>ใบแจ้งหนี้และ QR พร้อมเพย์</h3>
              <button className="secondary" onClick={() => setSelectedInvoiceId(null)}>ปิด</button>
            </div>
            <div className="receipt" ref={receiptRef}>
              <p><strong>{selectedInvoice.id}</strong></p>
              <p>ผู้เช่า: {selectedInvoice.tenantName}</p>
              <p>ห้อง: {selectedInvoice.room}</p>
              <p>ค่าเช่า: ฿{fmt(selectedInvoice.rent)}</p>
              <p>ค่าน้ำ: ฿{fmt(selectedInvoice.water)}</p>
              <p>ค่าไฟ: ฿{fmt(selectedInvoice.electric)}</p>
              <p><strong>ยอดรวม: ฿{fmt(selectedInvoice.rent + selectedInvoice.water + selectedInvoice.electric)}</strong></p>
              <p>ครบกำหนด: {selectedInvoice.dueDate}</p>
              <QRCodeSVG
                value={createPromptPayPayload("0812345678", selectedInvoice.rent + selectedInvoice.water + selectedInvoice.electric)}
                size={180}
                includeMargin
              />
              <small>QR พร้อมเพย์ตัวอย่าง (Mock Phone: 081-234-5678)</small>
            </div>
            <div className="action-group" style={{ marginTop: 12 }}>
              <button onClick={saveReceiptAsImage}>บันทึกเป็นรูปภาพ</button>
              <button className="secondary" onClick={shareViaLine}>แชร์ผ่าน Line</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
