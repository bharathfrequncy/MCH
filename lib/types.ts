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
  // Audit trail for edits
  editedBy?: string;
  editedAt?: string;
  editNote?: string;
}

export type OTRequestStatus = 'pending' | 'approved' | 'declined';

export interface OTRequest {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  date: string;
  fromTime: string; // HH:mm — start of requested OT
  toTime: string;   // HH:mm — end of requested OT
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

export type LeaveType = 'CL' | 'EL' | 'AL';
// CL = Casual Leave, EL = Emergency Leave, AL = Additional Leave

export type ApprovalStatus = 'pending' | 'approved' | 'declined';

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: LeaveType;
  date: string; // YYYY-MM-DD
  reason: string;
  // Replacement info — optional for EL with no replacement
  replacementStaffId?: string;
  replacementStaffName?: string;
  noReplacementAvailable?: boolean;      // true when staff selects "No Replacement Staff Available"
  noReplacementReason?: string;          // reason when no replacement is available
  replacementStatus: 'pending' | 'accepted' | 'declined' | 'na'; // 'na' for no-replacement / AL
  // Multi-level approval
  adminStatus: ApprovalStatus;
  jdStatus: ApprovalStatus;
  mdStatus: ApprovalStatus;
  // Who acted last
  adminActedBy?: string;
  jdActedBy?: string;
  mdActedBy?: string;
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
  lateMinutes?: number;      // how many minutes after shift start they checked in
  lateFineAmount?: number;   // fine for late check-in = lateMinutes × perMinuteWage
  status: 'checked-in' | 'checked-out' | 'absent';
}

export interface Fine {
  id: string;
  staffId: string;
  staffName: string;
  attendanceId: string;
  date: string;
  fineType: 'early-checkout' | 'late-checkin' | 'other';
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
