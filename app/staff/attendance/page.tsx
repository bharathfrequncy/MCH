'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentUser, getTodayAttendance, checkIn, checkOut } from '@/lib/storage';
import { getCurrentPosition, isOnSite, formatGeo } from '@/lib/geo';
import { User, AttendanceLog, Fine, GeoPoint } from '@/lib/types';
import { MapPin, LogIn, LogOut, CheckCircle2, AlertCircle, Loader2, Navigation, Clock, AlertTriangle } from 'lucide-react';

export default function AttendancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [log, setLog] = useState<AttendanceLog | undefined>(undefined);
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [geoError, setGeoError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [onSite, setOnSite] = useState<boolean | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [lateAlert, setLateAlert] = useState<{ lateMinutes: number; lateFineAmount: number } | null>(null);
  const [fine, setFine] = useState<Fine | null>(null);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;
    setUser(u);
    const todayLog = getTodayAttendance(u.id);
    setLog(todayLog);
    // Re-show late alert if already checked in late
    if (todayLog?.isLate && todayLog.lateMinutes && todayLog.lateMinutes > 0) {
      setLateAlert({ lateMinutes: todayLog.lateMinutes, lateFineAmount: todayLog.lateFineAmount ?? 0 });
    }
  }, []);

  // Live elapsed time
  useEffect(() => {
    if (!log?.checkInTime || log.status !== 'checked-in') return;
    const update = () => {
      const diff = Date.now() - new Date(log.checkInTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [log]);

  const fetchGeo = async () => {
    setGeoLoading(true);
    setGeoError('');
    try {
      const pos = await getCurrentPosition();
      setGeo(pos);
      setOnSite(isOnSite(pos));
    } catch (err: unknown) {
      setGeoError(err instanceof Error ? err.message : 'Could not get location');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setActionLoading(true);
    setLateAlert(null);
    let capturedGeo: GeoPoint | undefined;
    try {
      capturedGeo = await getCurrentPosition();
      setGeo(capturedGeo);
      setOnSite(isOnSite(capturedGeo));
    } catch {
      // Allow check-in without geo
    }
    const result = checkIn(user.id, capturedGeo);
    setLog(result.log);

    if (result.lateMinutes > 0) {
      setLateAlert({ lateMinutes: result.lateMinutes, lateFineAmount: result.lateFineAmount });
      setMessage({ type: 'warning', text: 'Checked in successfully.' });
    } else {
      setMessage({ type: 'success', text: 'Checked in on time! Have a great shift.' });
    }
    setActionLoading(false);
  };

  const handleCheckOut = async () => {
    if (!user || !log) return;
    setActionLoading(true);
    let capturedGeo: GeoPoint | undefined;
    try {
      capturedGeo = await getCurrentPosition();
      setGeo(capturedGeo);
    } catch {
      // Allow checkout without geo
    }
    const result = checkOut(log.id, capturedGeo);
    setLog(result.log);
    setFine(result.fine);
    if (result.fine) {
      setMessage({ type: 'warning', text: `Early checkout! Fine of ₹${result.fine.fineAmount.toFixed(2)} has been applied.` });
    } else {
      setMessage({ type: 'success', text: 'Checked out successfully! Good work today.' });
    }
    setActionLoading(false);
  };

  const shiftDuration = user?.shiftType === '9hr' ? '9 hours' : '8 hours';

  return (
    <DashboardLayout allowedRoles={['staff']} title="Attendance" subtitle="Mark your daily attendance with geotagging">

      {/* Late check-in alert — prominent banner */}
      {lateAlert && lateAlert.lateMinutes > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '1rem',
          padding: '1.25rem 1.5rem', borderRadius: 'var(--radius)',
          background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid var(--danger)',
          marginBottom: '1.5rem',
        }}>
          <AlertTriangle size={24} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>
              ⚠ Late Check-In — {lateAlert.lateMinutes} minute{lateAlert.lateMinutes !== 1 ? 's' : ''} late
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
              You checked in <strong>{lateAlert.lateMinutes} min</strong> after your scheduled shift start.
              A late fine of <strong style={{ color: 'var(--danger)' }}>₹{lateAlert.lateFineAmount.toFixed(2)}</strong> has been recorded.
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.35rem' }}>
              Fine calculation: {lateAlert.lateMinutes} min × ₹{user ? (user.hourlyWage / 60).toFixed(2) : '—'}/min
              = ₹{lateAlert.lateFineAmount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {message && !lateAlert && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Check In / Out Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today&apos;s Attendance</h3>
            <span className="chip">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}</span>
          </div>

          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            {/* Status Circle */}
            <div style={{
              width: 120, height: 120, borderRadius: '50%', margin: '0 auto 1.5rem',
              background: log?.status === 'checked-in' ? 'rgba(34,197,94,0.1)' : log?.status === 'checked-out' ? 'rgba(99,102,241,0.1)' : 'rgba(200,16,46,0.1)',
              border: `3px solid ${log?.status === 'checked-in' ? 'var(--success)' : log?.status === 'checked-out' ? '#6366f1' : 'var(--red)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '0.25rem',
            }}>
              {log?.status === 'checked-in' ? (
                <>
                  <CheckCircle2 size={32} color="var(--success)" />
                  <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>ON DUTY</span>
                </>
              ) : log?.status === 'checked-out' ? (
                <>
                  <CheckCircle2 size={32} color="#6366f1" />
                  <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>DONE</span>
                </>
              ) : (
                <>
                  <LogIn size={32} color="var(--red-light)" />
                  <span style={{ fontSize: '0.7rem', color: 'var(--red-light)', fontWeight: 700 }}>NOT IN</span>
                </>
              )}
            </div>

            {log?.status === 'checked-in' && (
              <div style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.5rem' }}>
                {elapsed}
              </div>
            )}

            <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
              Allocated Shift: <strong style={{ color: 'var(--text-1)' }}>{shiftDuration}</strong>
            </div>

            {/* Time Log */}
            {log && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>CHECK IN</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {new Date(log.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {log.isLate && log.lateMinutes && log.lateMinutes > 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '0.15rem', fontWeight: 600 }}>
                      {log.lateMinutes} min late
                    </div>
                  )}
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>CHECK OUT</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {log.checkOutTime
                      ? new Date(log.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            {!log || log.status === undefined ? (
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleCheckIn} disabled={actionLoading} id="check-in-btn">
                {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
                {actionLoading ? 'Marking...' : 'Check In'}
              </button>
            ) : log.status === 'checked-in' ? (
              <button className="btn btn-danger btn-lg" style={{ width: '100%' }} onClick={handleCheckOut} disabled={actionLoading} id="check-out-btn">
                {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                {actionLoading ? 'Marking...' : 'Check Out'}
              </button>
            ) : (
              <div style={{ padding: '0.875rem', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius)', color: '#a5b4fc', fontSize: '0.875rem', fontWeight: 600 }}>
                ✓ Attendance marked for today
                {log.lateFineAmount && log.lateFineAmount > 0 && (
                  <div style={{ color: 'var(--danger)', marginTop: '0.3rem', fontSize: '0.8rem' }}>Late Fine: ₹{log.lateFineAmount.toFixed(2)}</div>
                )}
                {log.fineAmount && log.fineAmount > 0 ? (
                  <div style={{ color: 'var(--danger)', marginTop: '0.2rem' }}>Early Checkout Fine: ₹{log.fineAmount.toFixed(2)}</div>
                ) : (
                  <div style={{ color: 'var(--success)', marginTop: '0.4rem' }}>No early checkout fine ✓</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Geolocation Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Location Verification</h3>
            <MapPin size={18} color="var(--red-light)" />
          </div>

          {!geo && !geoError && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Navigation size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-4)' }} />
              <p style={{ color: 'var(--text-3)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                Capture your current location to verify you are on-site at the hospital.
              </p>
              <button className="btn btn-secondary" onClick={fetchGeo} disabled={geoLoading} id="get-location-btn">
                {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                {geoLoading ? 'Getting Location...' : 'Get My Location'}
              </button>
            </div>
          )}

          {geoError && (
            <div className="alert alert-error">
              <AlertCircle />
              <div>
                <strong>Location Error</strong>
                <div>{geoError}</div>
              </div>
            </div>
          )}

          {geo && (
            <div>
              <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.4rem' }}>COORDINATES</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-1)' }}>{formatGeo(geo)}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span className={`geo-status ${onSite ? 'geo-onsite' : 'geo-remote'}`}>
                  {onSite ? '✓ On-Site' : '⚠ Remote Location'}
                </span>
                {!onSite && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Not within hospital premises</span>
                )}
              </div>

              {!onSite && (
                <div className="alert alert-warning">
                  <AlertCircle />
                  <span>You appear to be outside the hospital. Attendance will still be recorded but may be flagged.</span>
                </div>
              )}

              <button className="btn btn-ghost btn-sm" onClick={fetchGeo} disabled={geoLoading}>
                <Navigation size={14} /> Refresh Location
              </button>
            </div>
          )}

          <div className="divider" />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-4)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-3)' }}>Note:</strong> Location is captured at check-in and check-out.
            Ensure location services are enabled in your browser.
          </div>
        </div>

        {/* Fine Policy Card */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">Fine Policy</h3>
            <span className="badge badge-red">Important</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { icon: '⏰', title: 'Full Shift Required', desc: `Your allocated shift is ${shiftDuration}. Complete it fully to avoid early-checkout fines.` },
              { icon: '🕐', title: 'Late Check-in Fine', desc: `Late arrival = Minutes late × ₹${user ? (user.hourlyWage / 60).toFixed(2) : '—'}/min (based on your salary).` },
              { icon: '💸', title: 'Early Checkout Fine', desc: 'Early checkout is fined at 2× your per-minute wage for each minute short.' },
              { icon: '📋', title: 'Formula', desc: `Late: Mins × ₹${user ? (user.hourlyWage / 60).toFixed(2) : '—'}/min | Early-out: Mins × ₹${user ? (user.hourlyWage / 60).toFixed(2) : '—'}/min × 2` },
            ].map((item) => (
              <div key={item.title} style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
