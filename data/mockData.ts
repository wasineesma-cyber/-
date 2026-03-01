export type RoomStatus = "vacant" | "occupied" | "maintenance";
export type BillStatus = "paid" | "pending" | "overdue";

export const revenueHistory = [
  { month: "ม.ค.", amount: 120000 },
  { month: "ก.พ.", amount: 126000 },
  { month: "มี.ค.", amount: 122000 },
  { month: "เม.ย.", amount: 132000 },
  { month: "พ.ค.", amount: 136000 },
  { month: "มิ.ย.", amount: 141000 }
];

export const rooms = [
  { id: "A101", type: "Standard", status: "occupied" as RoomStatus, tenant: "นภัสสร" },
  { id: "A102", type: "Standard", status: "vacant" as RoomStatus, tenant: "-" },
  { id: "B201", type: "Deluxe", status: "maintenance" as RoomStatus, tenant: "-" },
  { id: "B202", type: "Deluxe", status: "occupied" as RoomStatus, tenant: "ชวิน" },
  { id: "C301", type: "Suite", status: "occupied" as RoomStatus, tenant: "สิรภพ" }
];

export const tenants = [
  { id: 1, name: "นภัสสร ทองดี", room: "A101", contact: "081-234-1111", lineId: "@naphatsorn", staySince: "2024-01-10" },
  { id: 2, name: "ชวิน รุ่งเรือง", room: "B202", contact: "091-678-2222", lineId: "@chawin", staySince: "2023-10-01" },
  { id: 3, name: "สิรภพ กาญจนา", room: "C301", contact: "065-999-3333", lineId: "@siraphop", staySince: "2022-05-12" }
];

export const invoices = [
  {
    id: "INV-2026-001",
    tenantName: "นภัสสร ทองดี",
    room: "A101",
    rent: 5000,
    water: 350,
    electric: 980,
    dueDate: "2026-07-05",
    status: "pending" as BillStatus
  },
  {
    id: "INV-2026-002",
    tenantName: "ชวิน รุ่งเรือง",
    room: "B202",
    rent: 7500,
    water: 420,
    electric: 1250,
    dueDate: "2026-07-03",
    status: "paid" as BillStatus
  },
  {
    id: "INV-2026-003",
    tenantName: "สิรภพ กาญจนา",
    room: "C301",
    rent: 9000,
    water: 560,
    electric: 1750,
    dueDate: "2026-06-28",
    status: "overdue" as BillStatus
  }
];
