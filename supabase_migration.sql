-- FieldSync worker migration — run this in your Supabase SQL editor
-- Replaces fake field crew (IDs 5–11) and concessions (IDs 9–11) with real people.
-- Umpires (IDs 1–4) are left untouched.

-- ── 1. Remove old fake field crew and concessions workers ────────────
DELETE FROM workers WHERE id IN (5,6,7,8,9,10,11);

-- ── 2. Remove stale day_assignments that referenced fake worker IDs ──
-- (field_crew and concessions arrays in Postgres are JSONB — clear them all
--  so auto-schedule starts fresh; umpire assignments are separate columns)
UPDATE day_assignments SET field_crew = '[]', concessions = '[]';

-- ── 3. Insert real field crew ────────────────────────────────────────
INSERT INTO workers (id, name, email, password, role, roles, avail, avail_by_role, years_exp, phone, pay_rates) VALUES
(5,  'Aidan Garver',       'aidan.garver@crew.com',       'aidan',    'field', NULL, '["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]', '{}', 6, '', '{}'),
(6,  'Brennan Niewinski',  'brennan.niewinski@crew.com',  'brennan',  'field', NULL, '["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]', '{}', 6, '', '{}'),
(7,  'Brock Benedict',     'brock.benedict@crew.com',     'brock',    'field', NULL, '["Mon","Wed"]',                               '{}', 1, '', '{}'),
(8,  'Trey Felts',         'trey.felts@crew.com',         'trey',     'field', NULL, '["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]', '{}', 1, '', '{}'),
(9,  'Amelia Deatherage',  'amelia.deatherage@crew.com',  'amelia',   'field', NULL, '["Mon","Wed","Fri","Sat"]',                   '{}', 1, '', '{}'),
(10, 'Dylan Keisler',      'dylan.keisler@crew.com',      'dylan',    'field', NULL, '["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]', '{}', 3, '', '{}'),
(11, 'Caroline Pavlisko',  'caroline.pavlisko@crew.com',  'caroline', 'field', NULL, '["Mon","Wed","Fri"]',                         '{}', 1, '', '{}'),
(12, 'Lucy Davis',         'lucy.davis@crew.com',         'lucy',     'field', NULL, '["Mon","Wed","Sat"]',                         '{}', 1, '', '{}');

-- ── 4. Insert real snack shack (concessions) workers ────────────────
-- Sub-roles: James=Grill, Ben=Back, Jack=Back, Juliana=Cashier, Natalia=Volunteer
-- avail=[] for Juliana means auto-scheduler never picks her — assign manually
INSERT INTO workers (id, name, email, password, role, roles, avail, avail_by_role, years_exp, phone, pay_rates) VALUES
(13, 'James',   'james@crew.com',   'james',   'concessions', NULL, '["Mon","Thu","Fri"]',                             '{}', 0, '', '{}'),
(14, 'Ben',     'ben@crew.com',     'ben',     'concessions', NULL, '["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]',     '{}', 0, '', '{}'),
(15, 'Jack',    'jack@crew.com',    'jack',    'concessions', NULL, '["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]',     '{}', 0, '', '{}'),
(16, 'Juliana', 'juliana@crew.com', 'juliana', 'concessions', NULL, '[]',                                             '{}', 0, '', '{}'),
(17, 'Natalia', 'natalia@crew.com', 'natalia', 'concessions', NULL, '["Mon","Thu","Fri"]',                            '{}', 0, '', '{}');

-- ── 5. Clear old requests and insert real vacation / time-off blocks ─
DELETE FROM requests WHERE id BETWEEN 200 AND 399;

INSERT INTO requests (id, type, worker_id, date, date_start, date_end, loc_id, role, label, reason, claimed_by, status, created) VALUES
-- Field crew vacations
(301, 'vacation',  7,  NULL, '2026-06-08', '2026-06-21', NULL, NULL, NULL, 'Vacation',    NULL, 'approved', '2026-06-01'),  -- Brock
(302, 'vacation',  9,  NULL, '2026-06-19', '2026-06-27', NULL, NULL, NULL, 'Vacation',    NULL, 'approved', '2026-06-01'),  -- Amelia
(303, 'time_off',  10, NULL, '2026-06-27', '2026-06-27', NULL, NULL, NULL, 'Time off',    NULL, 'approved', '2026-06-01'),  -- Dylan Jun 27
(304, 'time_off',  12, NULL, '2026-06-21', '2026-06-21', NULL, NULL, NULL, 'Time off',    NULL, 'approved', '2026-06-01'),  -- Lucy Jun 21
(305, 'vacation',  9,  NULL, '2026-07-06', '2026-07-09', NULL, NULL, NULL, 'Vacation',    NULL, 'approved', '2026-06-01'),  -- Amelia Jul 6–9
(306, 'vacation',  9,  NULL, '2026-07-13', '2026-07-16', NULL, NULL, NULL, 'Vacation',    NULL, 'approved', '2026-06-01'),  -- Amelia Jul 13–16
(307, 'vacation',  8,  NULL, '2026-07-19', '2026-07-31', NULL, NULL, NULL, 'Vacation',    NULL, 'approved', '2026-06-01'),  -- Trey Jul 19–31
(308, 'time_off',  11, NULL, '2026-07-22', '2026-07-22', NULL, NULL, NULL, 'Time off',    NULL, 'approved', '2026-06-01'),  -- Caroline Jul 22
(309, 'vacation',  9,  NULL, '2026-07-29', '2026-08-02', NULL, NULL, NULL, 'Vacation',    NULL, 'approved', '2026-06-01'),  -- Amelia Jul 29–Aug 2
(310, 'time_off',  10, NULL, '2026-08-13', '2026-08-13', NULL, NULL, NULL, 'Time off',    NULL, 'approved', '2026-06-01'),  -- Dylan Aug 13
-- Snack shack specific-date blocks
(311, 'time_off',  14, NULL, '2026-07-15', '2026-07-15', NULL, NULL, NULL, 'Unavailable', NULL, 'approved', '2026-06-01'),  -- Ben Jul 15
(312, 'time_off',  16, NULL, '2026-07-20', '2026-07-20', NULL, NULL, NULL, 'Not available', NULL, 'approved', '2026-06-01'), -- Juliana Jul 20
(313, 'time_off',  16, NULL, '2026-07-27', '2026-07-27', NULL, NULL, NULL, 'Not available', NULL, 'approved', '2026-06-01'); -- Juliana Jul 27

-- ── Done ─────────────────────────────────────────────────────────────
-- After running: refresh the app and confirm workers appear in Staff > Workers.
-- The auto-scheduler will respect all vacation blocks automatically.

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  worker_id bigint PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
  sub jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
