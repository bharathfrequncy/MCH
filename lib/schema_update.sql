-- Update Leaves table for multi-tier approval
ALTER TABLE mch_leaves 
ADD COLUMN IF NOT EXISTS jd_status approval_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS md_status approval_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS jd_acted_by UUID REFERENCES mch_users(id),
ADD COLUMN IF NOT EXISTS md_acted_by UUID REFERENCES mch_users(id),
ADD COLUMN IF NOT EXISTS jd_note TEXT,
ADD COLUMN IF NOT EXISTS md_note TEXT,
ADD COLUMN IF NOT EXISTS no_replacement_available BOOLEAN DEFAULT false;

-- Add na to approval_status if not exists
-- (Assuming approval_status is an enum created before: pending, approved, declined)
-- We need to add 'na' for cases where replacement isn't needed.
-- Note: PostgreSQL enums can't be easily modified in a transaction without careful syntax.
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'na';

-- Update Attendance table for late tracking
ALTER TABLE mch_attendance
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fine_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;

-- Update Fines table fine_type enum
ALTER TYPE fine_type ADD VALUE IF NOT EXISTS 'late-checkin';
