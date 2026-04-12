export type UserRole = 'staff' | 'admin' | 'jd' | 'md';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  staffId: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  hourlyWage: number; // ₹ per hour
  perMinuteWage: number; // derived: hourlyWage / 60
  shiftType: '8hr' | '9hr';
  joinDate: string;
  password: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  createdAt: string;
}

export interface DutyAllocation {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  shiftType: '8hr' | '9hr';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isLocked: boolean;
  allocatedBy: string; // admin userId
  createdAt: string;
}

export type OTRequestStatus = 'pending' | 'approved' | 'declined';

export interface OTRequest {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  date: string;
  reason: string;
  preferredShift: string;
  status: OTRequestStatus;
  adminNote?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: 'EC' | 'CL';
  date: string; // YYYY-MM-DD
  reason: string;
  replacementStaffId?: string;
  replacementStaffName?: string;
  replacementStatus: 'pending' | 'accepted' | 'declined';
  adminStatus: 'pending' | 'approved' | 'declined';
  createdAt: string;
}

export interface AttendanceLog {
  id: string;
  staffId: string;
  date: string;
  checkInTime: string;  // ISO string
  checkInGeo?: GeoPoint;
  checkOutTime?: string; // ISO string
  checkOutGeo?: GeoPoint;
  totalMinutes?: number;
  expectedMinutes: number;
  shortfallMinutes?: number;
  fineAmount?: number;
  isLate?: boolean;
  status: 'checked-in' | 'checked-out' | 'absent';
}

export interface Fine {
  id: string;
  staffId: string;
  staffName: string;
  attendanceId: string;
  date: string;
  shortfallMinutes: number;
  perMinuteWage: number;
  fineAmount: number;
  fineStatus: 'pending' | 'paid';
  createdAt: string;
}

export interface SalaryRecord {
  id: string;
  staffId: string;
  staffName: string;
  month: number; // 1-12
  year: number;
  baseSalary: number;
  otWages: number;
  finesDeducted: number;
  netSalary: number;
  generatedAt: string;
}

export interface AppConfig {
  hospitalLat: number;
  hospitalLng: number;
  hospitalName: string;
  defaultHourlyWage: number;
  lateFineAmount: number;
}
