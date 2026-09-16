-- Sahaayak Relational Database Schema
-- Compatible with PostgreSQL and SQLite

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  mobile TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL REFERENCES roles(id),
  is_active INTEGER DEFAULT 1,
  is_verified INTEGER DEFAULT 0,
  avatar_url TEXT,
  two_factor_enabled INTEGER DEFAULT 0,
  two_factor_secret TEXT,
  last_login_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob TEXT,
  gender TEXT,
  is_suspended INTEGER DEFAULT 0,
  suspension_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob TEXT,
  gender TEXT,
  address TEXT,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  skills TEXT,
  bio TEXT,
  service_radius_km REAL DEFAULT 15.0,
  languages TEXT,
  expected_working_hours TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  upi_id TEXT,
  is_approved INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending', -- pending, approved, rejected, changes_requested
  rejection_reason TEXT,
  is_online INTEGER DEFAULT 0,
  max_daily_jobs INTEGER DEFAULT 5,
  performance_score REAL DEFAULT 85.0,
  avg_rating REAL DEFAULT 5.0,
  total_reviews INTEGER DEFAULT 0,
  total_completed_jobs INTEGER DEFAULT 0,
  total_declined_jobs INTEGER DEFAULT 0,
  total_cancelled_jobs INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  department TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES service_categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  pricing_model TEXT NOT NULL, -- fixed, range, per_unit, inspection_plus_charges, base_plus_distance
  base_price REAL DEFAULT 0,
  min_price REAL DEFAULT 0,
  max_price REAL DEFAULT 0,
  per_unit_price REAL DEFAULT 0,
  inspection_fee REAL DEFAULT 0,
  per_km_price REAL DEFAULT 0,
  estimated_duration_mins INTEGER DEFAULT 60,
  service_radius_km REAL DEFAULT 20.0,
  requires_before_after_photos INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  form_schema_json TEXT, -- JSON schema describing custom inputs needed for this service
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_services (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(worker_id, service_id)
);

CREATE TABLE IF NOT EXISTS worker_documents (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- aadhaar, pan, driving_license, certificate
  document_number TEXT,
  file_url TEXT NOT NULL,
  is_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_availability (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 Sunday to 6 Saturday
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '19:00',
  is_available INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_locations (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL UNIQUE REFERENCES workers(id) ON DELETE CASCADE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home', -- Home, Work, Other
  house_no TEXT NOT NULL,
  building_name TEXT,
  street TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  landmark TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  worker_id TEXT REFERENCES workers(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  address_id TEXT NOT NULL REFERENCES addresses(id),
  status TEXT NOT NULL, 
  -- pending_payment, booking_confirmed, finding_worker, worker_assigned, worker_accepted, 
  -- worker_on_the_way, worker_arrived, service_started, service_completed, 
  -- customer_confirmation, payment_completed, booking_closed, cancelled, disputed
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  dynamic_fields_json TEXT,
  customer_notes TEXT,
  cancellation_reason TEXT,
  cancelled_by TEXT,
  before_photos_json TEXT DEFAULT '[]',
  after_photos_json TEXT DEFAULT '[]',
  base_service_amount REAL DEFAULT 0,
  total_labour_amount REAL DEFAULT 0,
  total_parts_amount REAL DEFAULT 0,
  tip_amount REAL DEFAULT 0,
  commission_amount REAL DEFAULT 0,
  final_amount REAL DEFAULT 0,
  payment_method TEXT, -- upi, card, cash
  payment_status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  assignment_attempts INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by_user_id TEXT,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_items (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL, -- base_service, inspection_fee, labour, parts, additional_work
  amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS additional_charge_requests (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES workers(id),
  description TEXT NOT NULL,
  labour_amount REAL DEFAULT 0,
  parts_amount REAL DEFAULT 0,
  photos_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
  responded_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  worker_id TEXT REFERENCES workers(id),
  service_labour_amount REAL NOT NULL,
  parts_materials_amount REAL DEFAULT 0,
  tip_amount REAL DEFAULT 0,
  platform_commission_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  payment_method TEXT NOT NULL, -- upi, card, cash
  payment_status TEXT NOT NULL, -- pending, completed, failed, refunded
  transaction_reference TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- payment, refund, payout
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  gateway TEXT DEFAULT 'demo_razorpay',
  gateway_response_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  worker_id TEXT NOT NULL REFERENCES workers(id),
  labour_amount REAL NOT NULL,
  commission_rate REAL NOT NULL,
  commission_amount REAL NOT NULL,
  rule_applied TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  worker_id TEXT NOT NULL REFERENCES workers(id),
  amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES workers(id),
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, paused, rejected
  payment_method TEXT DEFAULT 'upi',
  reference_no TEXT,
  processed_by_admin_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  amount REAL NOT NULL,
  refund_type TEXT NOT NULL, -- full, partial
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'processed', -- pending, processed, rejected
  approved_by_admin_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  pdf_url TEXT,
  invoice_data_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  rated_by_user_id TEXT NOT NULL REFERENCES users(id),
  target_user_id TEXT NOT NULL REFERENCES users(id),
  rating_type TEXT NOT NULL, -- customer_to_worker, worker_to_customer
  overall_rating INTEGER NOT NULL,
  quality_rating INTEGER,
  punctuality_rating INTEGER,
  behaviour_rating INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(booking_id, rated_by_user_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  reviewer_user_id TEXT NOT NULL REFERENCES users(id),
  reviewee_user_id TEXT NOT NULL REFERENCES users(id),
  review_type TEXT NOT NULL, -- customer_to_worker, worker_to_customer
  rating INTEGER NOT NULL,
  comment TEXT,
  is_moderated INTEGER DEFAULT 0,
  moderation_reason TEXT,
  moderated_by_admin_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(booking_id, reviewer_user_id)
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  complaint_number TEXT NOT NULL UNIQUE,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  filed_by_user_id TEXT NOT NULL REFERENCES users(id),
  against_user_id TEXT REFERENCES users(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_photos_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending', -- pending, investigating, resolved, rejected, escalated
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  resolution_notes TEXT,
  resolved_by_admin_id TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  worker_statement TEXT,
  customer_statement TEXT,
  admin_notes TEXT,
  status TEXT DEFAULT 'under_review',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id),
  receiver_user_id TEXT NOT NULL REFERENCES users(id),
  message_text TEXT NOT NULL,
  attachment_url TEXT,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, success, warning, alert
  category TEXT NOT NULL, -- booking, assignment, payment, complaint, system
  related_booking_id TEXT,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_value_json TEXT,
  new_value_json TEXT,
  reason TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value_json TEXT NOT NULL,
  description TEXT,
  updated_by_admin_id TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_performance (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL UNIQUE REFERENCES workers(id) ON DELETE CASCADE,
  completed_jobs_count INTEGER DEFAULT 0,
  declined_jobs_count INTEGER DEFAULT 0,
  cancelled_jobs_count INTEGER DEFAULT 0,
  no_shows_count INTEGER DEFAULT 0,
  total_assigned_count INTEGER DEFAULT 0,
  response_time_avg_sec REAL DEFAULT 45.0,
  on_time_rate REAL DEFAULT 98.0,
  repeat_customers_count INTEGER DEFAULT 0,
  calculated_score REAL DEFAULT 90.0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid lookup & scheduling
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker ON bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
