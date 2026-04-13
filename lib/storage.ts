import { User, Department, DutyAllocation, OTRequest, AttendanceLog, Fine, SalaryRecord, AppConfig } from './types';

// ─── Storage Keys ───────────────────────────────────────────────────────────
const KEYS = {
  USERS: 'mch_users',
  DEPARTMENTS: 'mch_departments',
  DUTIES: 'mch_duties',
  OT_REQUESTS: 'mch_ot_requests',
  ATTENDANCE: 'mch_attendance',
  FINES: 'mch_fines',
  SALARIES: 'mch_salaries',
  CURRENT_USER: 'mch_current_user',
  CONFIG: 'mch_config',
  LEAVES: 'mch_leaves',
};

function getItem<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Config ─────────────────────────────────────────────────────────────────
export function getConfig(): AppConfig {
  if (typeof window === 'undefined') return defaultConfig();
  try {
    const raw = localStorage.getItem(KEYS.CONFIG);
    return raw ? JSON.parse(raw) : defaultConfig();
  } catch {
    return defaultConfig();
  }
}

function defaultConfig(): AppConfig {
  return {
    hospitalLat: 11.0168, // Placeholder – add real coords later
    hospitalLng: 76.9558,
    hospitalName: "Mother Care Hospital",
    defaultHourlyWage: 50,
    lateFineAmount: 50,
  };
}

export function saveConfig(config: AppConfig): void {
  setItem(KEYS.CONFIG, [config]);
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
}

export function login(email: string, password: string): User | null {
  const users = getItem<User>(KEYS.USERS);
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.isActive
  );
  if (user) {
    setCurrentUser(user);
    return user;
  }
  return null;
}

export function logout(): void {
  setCurrentUser(null);
}

// ─── Users ───────────────────────────────────────────────────────────────────
export function getUsers(): User[] {
  return getItem<User>(KEYS.USERS);
}

export function getStaffUsers(): User[] {
  return getUsers().filter((u) => u.role === 'staff');
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function createUser(data: Omit<User, 'id' | 'perMinuteWage'>): User {
  const users = getUsers();
  const user: User = {
    ...data,
    id: genId(),
    perMinuteWage: data.hourlyWage / 60,
  };
  setItem(KEYS.USERS, [...users, user]);
  return user;
}

export function updateUser(id: string, data: Partial<User>): User | null {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data, perMinuteWage: (data.hourlyWage ?? users[idx].hourlyWage) / 60 };
  setItem(KEYS.USERS, users);
  // Update current user if self
  const current = getCurrentUser();
  if (current?.id === id) setCurrentUser(users[idx]);
  return users[idx];
}

export function deleteUser(id: string): void {
  const users = getUsers().filter((u) => u.id !== id);
  setItem(KEYS.USERS, users);
}

// ─── Departments ─────────────────────────────────────────────────────────────
export function getDepartments(): Department[] {
  return getItem<Department>(KEYS.DEPARTMENTS);
}

export function createDepartment(name: string): Department {
  const depts = getDepartments();
  const dept: Department = { id: genId(), name, createdAt: new Date().toISOString() };
  setItem(KEYS.DEPARTMENTS, [...depts, dept]);
  return dept;
}

export function deleteDepartment(id: string): void {
  setItem(KEYS.DEPARTMENTS, getDepartments().filter((d) => d.id !== id));
}

// ─── Duty Allocations ────────────────────────────────────────────────────────
export function getDuties(): DutyAllocation[] {
  return getItem<DutyAllocation>(KEYS.DUTIES);
}

export function getDutiesForStaff(staffId: string): DutyAllocation[] {
  return getDuties().filter((d) => d.staffId === staffId);
}

export function createDuty(data: Omit<DutyAllocation, 'id' | 'isLocked' | 'createdAt'>): DutyAllocation {
  const duties = getDuties();
  const duty: DutyAllocation = {
    ...data,
    id: genId(),
    isLocked: true, // Locked immediately on creation
    createdAt: new Date().toISOString(),
  };
  setItem(KEYS.DUTIES, [...duties, duty]);
  return duty;
}

export function deleteDuty(id: string): void {
  // Only unlocked duties can be deleted (shouldn't happen since all are locked on create)
  const duties = getDuties();
  const duty = duties.find((d) => d.id === id);
  if (duty && !duty.isLocked) {
    setItem(KEYS.DUTIES, duties.filter((d) => d.id !== id));
  }
}

// ─── OT Requests ─────────────────────────────────────────────────────────────
export function getOTRequests(): OTRequest[] {
  return getItem<OTRequest>(KEYS.OT_REQUESTS);
}

export function getOTRequestsForStaff(staffId: string): OTRequest[] {
  return getOTRequests().filter((r) => r.staffId === staffId);
}

export function createOTRequest(data: Omit<OTRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): OTRequest {
  const requests = getOTRequests();
  const req: OTRequest = {
    ...data,
    id: genId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  setItem(KEYS.OT_REQUESTS, [...requests, req]);
  return req;
}

export function reviewOTRequest(
  id: string,
  status: 'approved' | 'declined',
  adminNote: string,
  reviewedBy: string
): OTRequest | null {
  const requests = getOTRequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  requests[idx] = {
    ...requests[idx],
    status,
    adminNote,
    reviewedBy,
    updatedAt: new Date().toISOString(),
  };
  setItem(KEYS.OT_REQUESTS, requests);
  return requests[idx];
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export function getAttendanceLogs(): AttendanceLog[] {
  return getItem<AttendanceLog>(KEYS.ATTENDANCE);
}

export function getAttendanceForStaff(staffId: string): AttendanceLog[] {
  return getAttendanceLogs().filter((a) => a.staffId === staffId);
}

export function getTodayAttendance(staffId: string): AttendanceLog | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return getAttendanceLogs().find((a) => a.staffId === staffId && a.date === today);
}

export function checkIn(staffId: string, geo?: { lat: number; lng: number; accuracy: number }): AttendanceLog {
  const logs = getAttendanceLogs();
  const user = getUserById(staffId);
  const expectedMinutes = (user?.shiftType === '9hr' ? 9 : 8) * 60;
  
  const todayDate = new Date().toISOString().slice(0, 10);
  const checkInTime = new Date().toISOString();
  
  // Calculate lateness based on allocated duty or default 08:00
  let isLate = false;
  const duties = getDutiesForStaff(staffId).find(d => d.date === todayDate);
  const shiftStart = duties ? duties.startTime : '08:00';
  const startDateTime = new Date(`${todayDate}T${shiftStart}:00`);
  const checkInDateTime = new Date(checkInTime);
  
  // If checkIn is > 15 minutes after start time
  if ((checkInDateTime.getTime() - startDateTime.getTime()) > 15 * 60 * 1000) {
    isLate = true;
  }

  const log: AttendanceLog = {
    id: genId(),
    staffId,
    date: todayDate,
    checkInTime,
    checkInGeo: geo,
    expectedMinutes,
    isLate,
    status: 'checked-in',
  };
  logs.push(log);
  setItem(KEYS.ATTENDANCE, logs);
  
  return log;
}

export function checkOut(logId: string, geo?: { lat: number; lng: number; accuracy: number }): { log: AttendanceLog; fine: Fine | null } {
  const logs = getAttendanceLogs();
  const idx = logs.findIndex((l) => l.id === logId);
  if (idx === -1) throw new Error('Log not found');

  const log = logs[idx];
  const checkOutTime = new Date().toISOString();
  const checkInMs = new Date(log.checkInTime).getTime();
  const checkOutMs = new Date(checkOutTime).getTime();
  const totalMinutes = Math.floor((checkOutMs - checkInMs) / 60000);
  const shortfallMinutes = Math.max(0, log.expectedMinutes - totalMinutes);

  const user = getUserById(log.staffId);
  const perMinuteWage = user?.perMinuteWage ?? 50 / 60;
  const fineAmount = shortfallMinutes > 0 ? Math.round(shortfallMinutes * perMinuteWage * 2 * 100) / 100 : 0;

  logs[idx] = {
    ...log,
    checkOutTime,
    checkOutGeo: geo,
    totalMinutes,
    shortfallMinutes,
    fineAmount,
    status: 'checked-out',
  };
  setItem(KEYS.ATTENDANCE, logs);

  let fine: Fine | null = null;
  if (fineAmount > 0) {
    fine = createFine({
      staffId: log.staffId,
      staffName: user?.name ?? 'Unknown',
      attendanceId: log.id,
      date: log.date,
      shortfallMinutes,
      perMinuteWage,
      fineAmount,
    });
  }

  // Handle late check-in fine limit (if > 2 times late in month)
  if (log.isLate) {
    const monthLogs = logs.filter(l => 
      l.staffId === log.staffId && 
      l.status === 'checked-out' && 
      l.isLate && 
      new Date(l.date).getMonth() === new Date(log.date).getMonth()
    );
    if (monthLogs.length > 2) {
      // Create additional fine
      const lateFineAmount = getConfig().lateFineAmount;
      createFine({
        staffId: log.staffId,
        staffName: user?.name ?? 'Unknown',
        attendanceId: `${log.id}-late`,
        date: log.date,
        shortfallMinutes: 0,
        perMinuteWage: 0,
        fineAmount: lateFineAmount,
      });
    }
  }

  return { log: logs[idx], fine };
}

// ─── Fines ────────────────────────────────────────────────────────────────────
export function getFines(): Fine[] {
  return getItem<Fine>(KEYS.FINES);
}

export function getFinesForStaff(staffId: string): Fine[] {
  return getFines().filter((f) => f.staffId === staffId);
}

function createFine(data: Omit<Fine, 'id' | 'fineStatus' | 'createdAt'>): Fine {
  const fines = getFines();
  const fine: Fine = {
    ...data,
    id: genId(),
    fineStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
  setItem(KEYS.FINES, [...fines, fine]);
  return fine;
}

export function markFinePaid(id: string): void {
  const fines = getFines();
  const idx = fines.findIndex((f) => f.id === id);
  if (idx !== -1) {
    fines[idx].fineStatus = 'paid';
    setItem(KEYS.FINES, fines);
  }
}

// ─── Salary ───────────────────────────────────────────────────────────────────
export function getSalaryRecords(): SalaryRecord[] {
  return getItem<SalaryRecord>(KEYS.SALARIES);
}

export function generateMonthlySalary(staffId: string, month: number, year: number): SalaryRecord {
  const user = getUserById(staffId);
  if (!user) throw new Error('User not found');

  const fines = getFinesForStaff(staffId).filter((f) => {
    const d = new Date(f.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const attendance = getAttendanceForStaff(staffId).filter((a) => {
    const d = new Date(a.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const workingDays = attendance.filter((a) => a.status === 'checked-out').length;
  const baseSalary = workingDays * (user.shiftType === '9hr' ? 9 : 8) * user.hourlyWage;

  // OT wages: approved OT requests for this month
  const otRequests = getOTRequests().filter((r) => {
    const d = new Date(r.date);
    return r.staffId === staffId && r.status === 'approved' && d.getMonth() + 1 === month && d.getFullYear() === year;
  });
  const otWages = otRequests.length * 8 * user.hourlyWage * 1.5; // OT at 1.5x

  const finesDeducted = fines.reduce((sum, f) => sum + f.fineAmount, 0);
  const netSalary = baseSalary + otWages - finesDeducted;

  const salaries = getSalaryRecords();
  // Remove existing record for same month/year/staff if any
  const filtered = salaries.filter(
    (s) => !(s.staffId === staffId && s.month === month && s.year === year)
  );

  const record: SalaryRecord = {
    id: genId(),
    staffId,
    staffName: user.name,
    month,
    year,
    baseSalary,
    otWages,
    finesDeducted,
    netSalary,
    generatedAt: new Date().toISOString(),
  };
  setItem(KEYS.SALARIES, [...filtered, record]);
  return record;
}

// ─── Leaves ───────────────────────────────────────────────────────────────────
export function getLeaveRequests(): LeaveRequest[] {
  return getItem<LeaveRequest>(KEYS.LEAVES);
}

export function createLeaveRequest(data: Omit<LeaveRequest, 'id' | 'replacementStatus' | 'adminStatus' | 'createdAt'>): LeaveRequest {
  const leaves = getLeaveRequests();
  const leave: LeaveRequest = {
    ...data,
    id: genId(),
    replacementStatus: 'pending',
    adminStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
  setItem(KEYS.LEAVES, [...leaves, leave]);
  return leave;
}

export function updateLeaveReplacementStatus(id: string, status: 'accepted' | 'declined'): void {
  const leaves = getLeaveRequests();
  const idx = leaves.findIndex(l => l.id === id);
  if (idx !== -1) {
    leaves[idx].replacementStatus = status;
    setItem(KEYS.LEAVES, leaves);
  }
}

export function updateLeaveAdminStatus(id: string, status: 'approved' | 'declined'): void {
  const leaves = getLeaveRequests();
  const idx = leaves.findIndex(l => l.id === id);
  if (idx !== -1) {
    leaves[idx].adminStatus = status;
    setItem(KEYS.LEAVES, leaves);
  }
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
export function seedIfEmpty(): void {
  if (typeof window === 'undefined') return;
  const users = getUsers();

  // Default users
  const defaultUsers: Omit<User, 'id' | 'perMinuteWage'>[] = [
    {
      name: 'Dr. Priya Sharma',
      role: 'md',
      staffId: 'MCH-MD-001',
      email: 'md@mch.com',
      password: 'md123',
      phone: '9876543210',
      department: 'Management',
      designation: 'Managing Director',
      hourlyWage: 500,
      shiftType: '9hr',
      joinDate: '2020-01-01',
      isActive: true,
    },
    {
      name: 'Rajesh Kumar',
      role: 'jd',
      staffId: 'MCH-JD-001',
      email: 'jd@mch.com',
      password: 'jd123',
      phone: '9876543211',
      department: 'Management',
      designation: 'Joint Director',
      hourlyWage: 200,
      shiftType: '9hr',
      joinDate: '2021-01-01',
      isActive: true,
    },
    {
      name: 'Anitha Rajan',
      role: 'admin',
      staffId: 'MCH-ADM-001',
      email: 'admin@mch.com',
      password: 'admin123',
      phone: '9876543212',
      department: 'Administration',
      designation: 'Hospital Administrator',
      hourlyWage: 150,
      shiftType: '9hr',
      joinDate: '2021-06-01',
      isActive: true,
    },
    {
      name: 'Kavitha Nair',
      role: 'staff',
      staffId: 'MCH-STF-001',
      email: 'staff@mch.com',
      password: 'staff123',
      phone: '9876543213',
      department: 'OT',
      designation: 'Staff Nurse',
      hourlyWage: 50,
      shiftType: '8hr',
      joinDate: '2022-03-15',
      isActive: true,
    },
  ];

  // Only create users that don't exist by email
  defaultUsers.forEach((u) => {
    if (!users.some(existing => existing.email.toLowerCase() === u.email.toLowerCase())) {
      createUser(u);
    }
  });
}
