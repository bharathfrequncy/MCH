'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getConfig, saveConfig } from '@/lib/storage';
import { AppConfig } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const init = async () => {
      const cfg = await getConfig();
      setConfig(cfg);
    };
    init();
  }, []);

  const handleChange = (field: keyof AppConfig, value: any) => {
    setConfig(prev => prev ? { ...prev, [field]: value } : null);
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config) {
      await saveConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (!config) return null;

  return (
    <DashboardLayout allowedRoles={['admin', 'md', 'jd']} title="Platform Settings" subtitle="Configure global hospital constants">
      <div className="card" style={{ maxWidth: 600 }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>General Settings</h3>
        
        {saved && (
          <div className="alert alert-success">
            <CheckCircle2 />
            <span>Settings saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Hospital Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={config.hospitalName} 
              onChange={e => handleChange('hospitalName', e.target.value)}
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Hospital Latitude</label>
              <input 
                type="number" 
                step="any"
                className="form-control" 
                value={config.hospitalLat} 
                onChange={e => handleChange('hospitalLat', parseFloat(e.target.value))}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Hospital Longitude</label>
              <input 
                type="number" 
                step="any"
                className="form-control" 
                value={config.hospitalLng} 
                onChange={e => handleChange('hospitalLng', parseFloat(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Default Hourly Wage (₹)</label>
            <input 
              type="number" 
              className="form-control" 
              value={config.defaultHourlyWage} 
              onChange={e => handleChange('defaultHourlyWage', parseFloat(e.target.value))}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label" style={{ color: 'var(--red-light)' }}>Late Check-In Fine Amount (₹)</label>
            <small style={{ color: 'var(--text-3)', display: 'block', marginBottom: '0.5rem' }}>Auto-deducted when staff is &gt;15 mins late more than 2 times in a month.</small>
            <input 
              type="number" 
              className="form-control" 
              value={config.lateFineAmount} 
              onChange={e => handleChange('lateFineAmount', parseFloat(e.target.value))}
              required
              style={{ borderColor: 'var(--border-red)' }}
            />
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
