import { supabase } from './supabase';
import { 
  User, Department, DutyAllocation, OTRequest, AttendanceLog, 
  Fine, SalaryRecord, AppConfig, LeaveRequest, ApprovalStatus
} from './types';

// ─── Auth (Session still in localStorage for simplicity) ─────────────────────
const CURRENT_USER_KEY = 'mch_current_user';

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export async function login(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('mch_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('password', password)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  
  const user = {
    ...data,
    perMinuteWage: Number(data.hourly_wage) / 60
  } as User;
  
  setCurrentUser(user);
  return user;
}

export function logout(): void {
  setCurrentUser(null);
}

// ─── App Config ─────────────────────────────────────────────────────────────
export async function getConfig(): Promise<AppConfig> {
  const { data, error } = await supabase
    .from('mch_config')
    .select('*')
    .single();

  if (error || !data) {
    return {
      hospitalLat: 11.0168,
      hospitalLng: 76.9558,
      hospitalName: "Mother Care Hospital",
      defaultHourlyWage: 60,
      lateFineAmount: 50,
    };
  }

  return {
    hospitalLat: Number(data.hospital_lat),
    hospitalLng: Number(data.hospital_lng),
    hospitalName: data.hospital_name,
    defaultHourlyWage: Number(data.default_hourly_wage),
    lateFineAmount: Number(data.late_fine_amount),
  };
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await supabase
    .from('mch_config')
    .upsert({
      id: 1,
      hospital_lat: config.hospitalLat,
      hospital_lng: config.hospitalLng,
      hospital_name: config.hospitalName,
      default_hourly_wage: config.defaultHourlyWage,
      late_fine_amount: config.lateFineAmount,
    });
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('mch_users')
    .select('*')
    .order('name');

  if (error) return [];
  return data.map(u => ({
    ...u,
    perMinuteWage: Number(u.hourly_wage) / 60
  })) as User[];
}

export async function getStaffUsers(): Promise<User[]> {
  const users = await getUsers();
  return users.filter(u => u.role === 'staff');
}

export async function getUserById(id: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from('mch_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;
  return { ...data, perMinuteWage: Number(data.hourly_wage) / 60 } as User;
}

export async function createUser(data: Omit<User, 'id' | 'perMinuteWage'>): Promise<User> {
  const { data: newUser, error } = await supabase
    .from('mch_users')
    .insert([{
      name: data.name,
      role: data.role,
      staff_id: data.staffId,
      email: data.email,
      phone: data.phone,
      department: data.department,
      designation: data.designation,
      hourly_wage: data.hourlyWage,
      shift_type: data.shiftType,
      join_date: data.joinDate,
      password: data.password,
      is_active: data.isActive
    }])
    .select()
    .single();

  if (error) throw error;
  return { ...newUser, perMinuteWage: Number(newUser.hourly_wage) / 60 } as User;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const { data: updated, error } = await supabase
    .from('mch_users')
    .update({
      name: data.name,
      role: data.role,
      staff_id: data.staffId,
      email: data.email,
      phone: data.phone,
      department: data.department,
      designation: data.designation,
      hourly_wage: data.hourlyWage,
      shift_type: data.shiftType,
      join_date: data.joinDate,
      password: data.password,
      is_active: data.isActive
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  const user = { ...updated, perMinuteWage: Number(updated.hourly_wage) / 60 } as User;
  
  const current = getCurrentUser();
  if (current?.id === id) setCurrentUser(user);
  
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await supabase.from('mch_users').delete().eq('id', id);
}

// ─── Departments ─────────────────────────────────────────────────────────────
export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from('mch_departments').select('*').order('name');
  if (error) return [];
  return data as Department[];
}

export async function createDepartment(name: string): Promise<Department> {
  const { data, error } = await supabase
    .from('mch_departments')
    .insert([{ name }])
    .select()
    .single();
  if (error) throw error;
  return data as Department;
}

export async function deleteDepartment(id: string): Promise<void> {
  await supabase.from('mch_departments').delete().eq('id', id);
}

// ─── Duties ──────────────────────────────────────────────────────────────────
export async function getDuties(): Promise<DutyAllocation[]> {
  const { data, error } = await supabase.from('mch_duties').select('*').order('date', { ascending: false });
  if (error) return [];
  return data.map(d => ({
    ...d,
    staffId: d.staff_id,
    shiftType: d.shift_type,
    startTime: d.start_time,
    endTime: d.end_time,
    isLocked: d.is_locked,
    allocatedBy: d.allocated_by,
    createdAt: d.created_at
  })) as unknown as DutyAllocation[];
}

export async function getDutiesForStaff(staffId: string): Promise<DutyAllocation[]> {
  const { data, error } = await supabase
    .from('mch_duties')
    .select('*')
    .eq('staff_id', staffId)
    .order('date', { ascending: false });
  
  if (error) return [];
  return data as unknown as DutyAllocation[];
}

export async function createDuty(data: Omit<DutyAllocation, 'id' | 'isLocked' | 'createdAt'>): Promise<DutyAllocation> {
  const { data: newDuty, error } = await supabase
    .from('mch_duties')
    .insert([{
      staff_id: data.staffId,
      date: data.date,
      shift_type: data.shiftType,
      start_time: data.startTime,
      end_time: data.endTime,
      is_locked: true,
      allocated_by: data.allocatedBy
    }])
    .select()
    .single();

  if (error) throw error;
  return newDuty as unknown as DutyAllocation;
}

export async function editDuty(
  id: string,
  data: { shiftType: string; startTime: string; endTime: string; editNote?: string },
  editorId: string
): Promise<DutyAllocation | null> {
  const { data: updated, error } = await supabase
    .from('mch_duties')
    .update({
      shift_type: data.shiftType,
      start_time: data.startTime,
      end_time: data.endTime,
      edited_by: editorId,
      edited_at: new Date().toISOString(),
      edit_note: data.editNote
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return updated as unknown as DutyAllocation;
}

export async function copyLastMonthDuties(targetYear: number, targetMonth: number, allocatedBy: string): Promise<number> {
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

  const padM = (m: number) => String(m).padStart(2, '0');
  const prevPrefix = `${prevYear}-${padM(prevMonth)}`;
  const targetPrefix = `${targetYear}-${padM(targetMonth)}`;

  const { data: prevDuties } = await supabase
    .from('mch_duties')
    .select('*')
    .like('date', `${prevPrefix}%`);

  if (!prevDuties || prevDuties.length === 0) return 0;

  const daysInTarget = new Date(targetYear, targetMonth, 0).getDate();
  let copiedCount = 0;

  const newDutiesBatch = prevDuties.map((d) => {
    const dayNum = parseInt(d.date.slice(8, 10), 10);
    if (dayNum > daysInTarget) return null;
    const newDate = `${targetPrefix}-${padM(dayNum)}`;
    
    return {
      staff_id: d.staff_id,
      date: newDate,
      shift_type: d.shift_type,
      start_time: d.start_time,
      end_time: d.end_time,
      is_locked: true,
      allocated_by: allocatedBy,
      edit_note: `Copied from ${d.date}`
    };
  }).filter(Boolean);

  if (newDutiesBatch.length > 0) {
    const { count, error } = await supabase
      .from('mch_duties')
      .upsert(newDutiesBatch as any, { onConflict: 'staff_id, date', ignoreDuplicates: true });
    
    if (!error) copiedCount = newDutiesBatch.length;
  }

  return copiedCount;
}

export async function deleteDuty(id: string): Promise<void> {
  // Only delete if not locked (though mostly they are locked in this system)
  await supabase.from('mch_duties').delete().eq('id', id).eq('is_locked', false);
}

// ─── OT Requests ─────────────────────────────────────────────────────────────
export async function getOTRequests(): Promise<OTRequest[]> {
  const { data, error } = await supabase.from('mch_ot_requests').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data as unknown as OTRequest[];
}

export async function getOTRequestsForStaff(staffId: string): Promise<OTRequest[]> {
  const { data, error } = await supabase
    .from('mch_ot_requests')
    .select('*')
    .eq('staff_id', staffId)
    .order('date', { ascending: false });
  if (error) return [];
  return data as unknown as OTRequest[];
}

export async function createOTRequest(data: Omit<OTRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<OTRequest> {
  const { data: newReq, error } = await supabase
    .from('mch_ot_requests')
    .insert([{
      staff_id: data.staffId,
      staff_name: data.staffName,
      department: data.department,
      date: data.date,
      reason: data.reason,
      preferred_shift: data.preferredShift,
      status: 'pending'
    }])
    .select()
    .single();
  if (error) throw error;
  return newReq as unknown as OTRequest;
}

export async function reviewOTRequest(id: string, status: 'approved' | 'declined', adminNote: string, reviewedBy: string): Promise<OTRequest | null> {
  const { data, error } = await supabase
    .from('mch_ot_requests')
    .update({ status, admin_note: adminNote, reviewed_by: reviewedBy, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return null;
  return data as unknown as OTRequest;
}

// ─── Attendance ──────────────────────────────────────────────────────────────
export async function getAttendanceLogs(): Promise<AttendanceLog[]> {
  const { data, error } = await supabase.from('mch_attendance').select('*').order('date', { ascending: false });
  if (error) return [];
  return data as unknown as AttendanceLog[];
}

export async function getAttendanceForStaff(staffId: string): Promise<AttendanceLog[]> {
  const { data, error } = await supabase
    .from('mch_attendance')
    .select('*')
    .eq('staff_id', staffId)
    .order('date', { ascending: false });
  if (error) return [];
  return data as unknown as AttendanceLog[];
}

export async function getTodayAttendance(staffId: string): Promise<AttendanceLog | undefined> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('mch_attendance')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', today)
    .single();
  if (error || !data) return undefined;
  return data as unknown as AttendanceLog;
}

export async function checkIn(staffId: string, geo?: { lat: number; lng: number; accuracy: number }): Promise<{ log: AttendanceLog; lateMinutes: number; lateFineAmount: number }> {
  const todayDate = new Date().toISOString().slice(0, 10);
  const checkInTime = new Date().toISOString();
  
  const user = await getUserById(staffId);
  if (!user) throw new Error('User not found');
  const expectedMinutes = (user.shiftType === '9hr' ? 9 : 8) * 60;
  
  // Find shift start time
  const duties = await getDutiesForStaff(staffId);
  const duty = duties.find((d) => d.date === todayDate);
  const shiftStart = duty ? duty.startTime : '08:00';
  const startDateTime = new Date(`${todayDate}T${shiftStart}:00`);
  const checkInDateTime = new Date(checkInTime);

  // Calculate late minutes
  const diffMs = checkInDateTime.getTime() - startDateTime.getTime();
  const lateMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const isLate = lateMinutes > 0;

  const lateFineAmount = isLate ? Math.round(lateMinutes * user.perMinuteWage * 100) / 100 : 0;

  const { data: log, error } = await supabase
    .from('mch_attendance')
    .insert([{
      staff_id: staffId,
      date: todayDate,
      check_in_time: checkInTime,
      check_in_geo: geo,
      expected_minutes: expectedMinutes,
      is_late: isLate,
      late_minutes: lateMinutes,
      late_fine_amount: lateFineAmount,
      status: 'checked-in'
    }])
    .select()
    .single();

  if (error) throw error;

  // Create auto fine for late check-in if applicable
  if (isLate && lateFineAmount > 0) {
    await createFine({
      staffId,
      staffName: user.name,
      attendanceId: log.id,
      date: todayDate,
      fineType: 'late-checkin',
      shortfallMinutes: lateMinutes,
      perMinuteWage: user.perMinuteWage,
      fineAmount: lateFineAmount,
    });
  }

  return { log: log as unknown as AttendanceLog, lateMinutes, lateFineAmount };
}

export async function checkOut(logId: string, geo?: { lat: number; lng: number; accuracy: number }): Promise<{ log: AttendanceLog; fine: Fine | null }> {
  const { data: log, error: fetchErr } = await supabase.from('mch_attendance').select('*').eq('id', logId).single();
  if (fetchErr || !log) throw new Error('Log not found');

  const checkOutTime = new Date().toISOString();
  const checkInTime = new Date(log.check_in_time).getTime();
  const totalMinutes = Math.floor((new Date(checkOutTime).getTime() - checkInTime) / 60000);
  const shortfallMinutes = Math.max(0, log.expected_minutes - totalMinutes);

  const user = await getUserById(log.staff_id);
  const perMinuteWage = (user?.hourlyWage ?? 50) / 60;
  const fineAmount = shortfallMinutes > 0 ? Math.round(shortfallMinutes * perMinuteWage * 2 * 100) / 100 : 0;

  const { data: updatedLog, error: updateErr } = await supabase
    .from('mch_attendance')
    .update({
      check_out_time: checkOutTime,
      check_out_geo: geo,
      total_minutes: totalMinutes,
      shortfall_minutes: shortfallMinutes,
      fine_amount: fineAmount,
      status: 'checked-out'
    })
    .eq('id', logId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  let fine: Fine | null = null;
  if (fineAmount > 0) {
    fine = await createFine({
      staffId: log.staff_id,
      staffName: user?.name ?? 'Unknown',
      attendanceId: log.id,
      date: log.date,
      fineType: 'early-checkout',
      shortfallMinutes,
      perMinuteWage,
      fineAmount,
    });
  }

  return { log: updatedLog as unknown as AttendanceLog, fine };
}

// ─── Fines ───────────────────────────────────────────────────────────────────
export async function getFines(): Promise<Fine[]> {
  const { data, error } = await supabase.from('mch_fines').select('*').order('date', { ascending: false });
  if (error) return [];
  return data as unknown as Fine[];
}

export async function getFinesForStaff(staffId: string): Promise<Fine[]> {
  const { data, error } = await supabase
    .from('mch_fines')
    .select('*')
    .eq('staff_id', staffId)
    .order('date', { ascending: false });
  if (error) return [];
  return data as unknown as Fine[];
}

export async function createFine(data: Omit<Fine, 'id' | 'fineStatus' | 'createdAt'>): Promise<Fine> {
  const { data: fine, error } = await supabase
    .from('mch_fines')
    .insert([{
      staff_id: data.staffId,
      staff_name: data.staffName,
      attendance_id: data.attendanceId,
      date: data.date,
      fine_type: data.fineType,
      shortfall_minutes: data.shortfallMinutes,
      per_minute_wage: data.per_minute_wage,
      fine_amount: data.fineAmount,
      fine_status: 'pending'
    }])
    .select()
    .single();
  if (error) throw error;
  return fine as unknown as Fine;
}

export async function markFinePaid(id: string): Promise<void> {
  await supabase.from('mch_fines').update({ fine_status: 'paid' }).eq('id', id);
}

// ─── Salary ──────────────────────────────────────────────────────────────────
export async function getSalaryRecords(): Promise<SalaryRecord[]> {
  const { data, error } = await supabase.from('mch_salaries').select('*').order('year', { ascending: false }).order('month', { ascending: false });
  if (error) return [];
  return data as unknown as SalaryRecord[];
}

export async function generateMonthlySalary(staffId: string, month: number, year: number): Promise<SalaryRecord | null> {
  const user = await getUserById(staffId);
  if (!user) throw new Error('User not found');

  const padM = (m: number) => String(m).padStart(2, '0');
  const datePrefix = `${year}-${padM(month)}`;

  // Fetch data
  const [finesRes, attendanceRes, otsRes] = await Promise.all([
    supabase.from('mch_fines').select('fine_amount').eq('staff_id', staffId).like('date', `${datePrefix}%`),
    supabase.from('mch_attendance').select('status').eq('staff_id', staffId).eq('status', 'checked-out').like('date', `${datePrefix}%`),
    supabase.from('mch_ot_requests').select('*').eq('staff_id', staffId).eq('status', 'approved').like('date', `${datePrefix}%`)
  ]);
  
  const workingDays = attendanceRes.data?.length || 0;
  const baseSalary = workingDays * (user.shiftType === '9hr' ? 9 : 8) * user.hourlyWage;

  const otWages = (otsRes.data?.length || 0) * 8 * user.hourlyWage * 1.5;
  const finesDeducted = (finesRes.data || []).reduce((sum, f) => sum + Number(f.fine_amount), 0);
  const netSalary = baseSalary + otWages - finesDeducted;

  const { data: record, error } = await supabase
    .from('mch_salaries')
    .upsert({
      staff_id: staffId,
      staff_name: user.name,
      month,
      year,
      base_salary: baseSalary,
      ot_wages: otWages,
      fines_deducted: finesDeducted,
      net_salary: netSalary,
      generated_at: new Date().toISOString()
    }, { onConflict: 'staff_id, month, year' })
    .select()
    .single();

  if (error) throw error;
  return record as unknown as SalaryRecord;
}

// ─── Leaves ──────────────────────────────────────────────────────────────────
export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const { data, error } = await supabase.from('mch_leaves').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data.map(l => ({
    ...l,
    staffId: l.staff_id,
    staffName: l.staff_name,
    leaveType: l.leave_type,
    replacementStaffId: l.replacement_staff_id,
    replacementStaffName: l.replacement_staff_name,
    replacementStatus: l.replacement_status,
    adminStatus: l.admin_status,
    jdStatus: l.jd_status,
    mdStatus: l.md_status,
    adminActedBy: l.admin_acted_by,
    jdActedBy: l.jd_acted_by,
    mdActedBy: l.md_acted_by,
    noReplacementAvailable: l.no_replacement_available,
    createdAt: l.created_at
  })) as unknown as LeaveRequest[];
}

export async function createLeaveRequest(data: Omit<LeaveRequest, 'id' | 'replacementStatus' | 'adminStatus' | 'jdStatus' | 'mdStatus' | 'createdAt'>): Promise<LeaveRequest> {
  const needsReplacement = data.leaveType !== 'AD' && !data.noReplacementAvailable;
  
  const { data: leave, error } = await supabase
    .from('mch_leaves')
    .insert([{
      staff_id: data.staffId,
      staff_name: data.staffName,
      leave_type: data.leaveType,
      date: data.date,
      reason: data.reason,
      replacement_staff_id: data.replacementStaffId,
      replacement_staff_name: data.replacementStaffName,
      replacement_status: needsReplacement ? 'pending' : 'na',
      admin_status: 'pending',
      jd_status: 'pending',
      md_status: 'pending',
      no_replacement_available: data.noReplacementAvailable
    }])
    .select()
    .single();
  if (error) throw error;
  return leave as unknown as LeaveRequest;
}

export async function updateLeaveReplacementStatus(id: string, status: 'accepted' | 'declined'): Promise<void> {
  await supabase.from('mch_leaves').update({ replacement_status: status }).eq('id', id);
}

export async function updateLeaveAdminStatus(id: string, status: ApprovalStatus, actorId?: string): Promise<void> {
  await supabase.from('mch_leaves').update({ admin_status: status, admin_acted_by: actorId }).eq('id', id);
}

export async function updateLeaveJDStatus(id: string, status: ApprovalStatus, actorId?: string): Promise<void> {
  await supabase.from('mch_leaves').update({ jd_status: status, jd_acted_by: actorId }).eq('id', id);
}

export async function updateLeaveMDStatus(id: string, status: ApprovalStatus, actorId?: string): Promise<void> {
  await supabase.from('mch_leaves').update({ md_status: status, md_acted_by: actorId }).eq('id', id);
}

export function getOverallLeaveStatus(leave: LeaveRequest): 'approved' | 'declined' | 'pending' {
  const { adminStatus, jdStatus, mdStatus, leaveType } = leave;
  if ([adminStatus, jdStatus, mdStatus].some((s) => s === 'declined')) return 'declined';

  if (leaveType === 'AD') {
    return adminStatus === 'approved' && jdStatus === 'approved' && mdStatus === 'approved'
      ? 'approved'
      : 'pending';
  }
  if (adminStatus === 'approved' || jdStatus === 'approved' || mdStatus === 'approved') return 'approved';
  return 'pending';
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
export async function seedIfEmpty(): Promise<void> {
  try {
    const { count, error } = await supabase.from('mch_users').select('*', { count: 'exact', head: true });
    if (error) {
      console.warn('Seed check failed (probably no tables yet):', error.message);
      return; 
    }
    if (count && count > 0) return;

    const defaultUsers = [
      { name: 'Dr. Priya Sharma', role: 'md', staffId: 'MCH-MD-001', email: 'md@mch.com', password: 'md123', phone: '9876543210', department: 'Management', designation: 'Managing Director', hourlyWage: 500, shiftType: '9hr', joinDate: '2020-01-01', isActive: true },
      { name: 'Rajesh Kumar', role: 'jd', staffId: 'MCH-JD-001', email: 'jd@mch.com', password: 'jd123', phone: '9876543211', department: 'Management', designation: 'Joint Director', hourlyWage: 200, shiftType: '9hr', joinDate: '2021-01-01', isActive: true },
      { name: 'Anitha Rajan', role: 'admin', staffId: 'MCH-ADM-001', email: 'admin@mch.com', password: 'admin123', phone: '9876543212', department: 'Administration', designation: 'Hospital Administrator', hourlyWage: 150, shiftType: '9hr', joinDate: '2021-06-01', isActive: true },
      { name: 'Kavitha Nair', role: 'staff', staffId: 'MCH-STF-001', email: 'staff@mch.com', password: 'staff123', phone: '9876543213', department: 'OT', designation: 'Staff Nurse', hourlyWage: 60, shiftType: '8hr', joinDate: '2022-03-15', isActive: true },
    ];

    for (const u of defaultUsers) {
      await createUser(u as any);
    }
  } catch (err) {
    console.error('seedIfEmpty fatal error:', err);
  }
}
