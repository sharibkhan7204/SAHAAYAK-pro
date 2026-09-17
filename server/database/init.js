const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

async function initDatabase() {
  console.log('[INIT] Initializing database schema...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  
  try {
    await db.exec(schemaSql);
  } catch (err) {
    console.error('[INIT] Error executing schema:', err.message);
  }

  console.log('[INIT] Schema applied successfully.');
  await seedData();
}

async function seedData() {
  console.log('[SEED] Checking if database requires seeding...');
  const existingUser = await db.get('SELECT id FROM users LIMIT 1');
  if (existingUser) {
    console.log('[SEED] Database already contains records. Skipping seed.');
    return;
  }

  console.log('[SEED] Seeding initial roles, settings, services, users, bookings...');

  // 1. Roles
  await db.run('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', ['customer', 'customer', 'Standard customer looking for home services']);
  await db.run('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', ['worker', 'worker', 'Verified gig worker / service provider']);
  await db.run('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', ['admin', 'admin', 'System administrator with platform oversight']);

  // 2. System Settings
  await db.run(
    'INSERT INTO system_settings (id, key, value_json, description) VALUES (?, ?, ?, ?)',
    ['set_assignment', 'assignment_settings', JSON.stringify({
      assignment_radius_km: 25,
      distance_weight: 0.35,
      workload_weight: 0.20,
      rating_weight: 0.25,
      fairness_weight: 0.10,
      performance_weight: 0.10,
      response_timeout_sec: 45,
      max_assignment_attempts: 3,
      max_daily_jobs: 5
    }), 'Weights and constraints for automatic worker assignment engine']
  );

  await db.run(
    'INSERT INTO system_settings (id, key, value_json, description) VALUES (?, ?, ?, ?)',
    ['set_commission', 'commission_settings', JSON.stringify({
      threshold_amount: 599, // Below or equal to 599: 0% commission!
      commission_percentage: 10.0, // Above 599: 10% on labour only
      exclude_parts: true,
      exclude_tips: true
    }), 'Fair commission rules: 0% commission <= ₹599, configured % on labour only > ₹599']
  );

  await db.run(
    'INSERT INTO system_settings (id, key, value_json, description) VALUES (?, ?, ?, ?)',
    ['set_platform', 'platform_settings', JSON.stringify({
      platform_name: 'Sahaayak',
      tagline: 'Trusted Services, Right at Your Doorstep',
      support_phone: '+91 80000 12345',
      support_email: 'support@sahaayak.in',
      demo_mode: true
    }), 'Platform branding and hackathon demo switches']
  );

  // 3. Service Categories
  const categories = [
    { id: 'cat_cleaning', name: 'Cleaning & Housekeeping', slug: 'cleaning', icon: 'Sparkles', desc: 'Deep cleaning, sanitization & specialized housekeeping', order: 1 },
    { id: 'cat_repairs', name: 'Repairs & Maintenance', slug: 'repairs', icon: 'Wrench', desc: 'Expert plumbing, electrical, and AC technicians', order: 2 },
    { id: 'cat_improvement', name: 'Home Improvement', slug: 'home-improvement', icon: 'Paintbrush', desc: 'Interior & exterior painting, carpentry, renovation', order: 3 },
    { id: 'cat_auto', name: 'Vehicle Services', slug: 'auto-care', icon: 'Car', desc: 'Doorstep waterless & foam car wash and detailing', order: 4 },
    { id: 'cat_beauty', name: 'Beauty & Wellness', slug: 'beauty', icon: 'Heart', desc: 'Professional salon, spa, and groomer services at home', order: 5 },
    { id: 'cat_logistics', name: 'Logistics & Moving', slug: 'logistics', icon: 'Truck', desc: 'Inter-city and local relocation, parcel and courier delivery', order: 6 }
  ];

  for (const cat of categories) {
    await db.run(
      'INSERT INTO service_categories (id, name, slug, icon, description, display_order) VALUES (?, ?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.slug, cat.icon, cat.desc, cat.order]
    );
  }

  // 4. Initial 9 Services
  const services = [
    {
      id: 'srv_home_clean',
      category_id: 'cat_cleaning',
      name: 'Home Cleaning',
      slug: 'home-cleaning',
      description: 'Comprehensive deep cleaning for apartments and independent houses. Includes floor scrubbing, kitchen degreasing, bathroom descaling, and balcony dusting.',
      image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'range',
      base_price: 1999,
      min_price: 1999,
      max_price: 2499,
      per_unit_price: 0,
      inspection_fee: 0,
      per_km_price: 0,
      estimated_duration_mins: 180,
      service_radius_km: 25,
      requires_before_after_photos: 1,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'bhk', label: 'Apartment Size / BHK', type: 'select', options: ['1 BHK', '2 BHK', '3 BHK', '4 BHK / Villa'], required: true },
          { name: 'bathrooms', label: 'Number of Bathrooms', type: 'number', default: 2, min: 1, max: 6, required: true },
          { name: 'house_size_sqft', label: 'Approximate Size (sq ft)', type: 'number', default: 1200, required: true },
          { name: 'requirements', label: 'Specific Focus Areas', type: 'textarea', placeholder: 'E.g., Extra attention to kitchen chimney and grease stains' }
        ]
      })
    },
    {
      id: 'srv_plumbing_elec',
      category_id: 'cat_repairs',
      name: 'Plumbing & Electrical',
      slug: 'plumbing-electrical',
      description: 'Certified technicians for pipe leakages, tap replacements, circuit breaker tripping, switchboard repairs, and sanitary fittings.',
      image_url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'inspection_plus_charges',
      base_price: 99,
      min_price: 99,
      max_price: 99,
      per_unit_price: 0,
      inspection_fee: 99,
      per_km_price: 0,
      estimated_duration_mins: 60,
      service_radius_km: 20,
      requires_before_after_photos: 1,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'problem_type', label: 'Issue Category', type: 'select', options: ['Pipe Leakage / Drain Block', 'Tap / Shower Fitting', 'Switchboard / Wiring Fault', 'Geyser / Water Heater Connection', 'Ceiling Fan / Light Fixture', 'Other Electrical / Plumbing'], required: true },
          { name: 'description', label: 'Describe the issue', type: 'textarea', placeholder: 'Explain what is leaking or failing to turn on...', required: true },
          { name: 'urgency', label: 'Urgency', type: 'select', options: ['Standard', 'Urgent / Same Day'], required: true }
        ]
      })
    },
    {
      id: 'srv_ac_repair',
      category_id: 'cat_repairs',
      name: 'AC Repair & Servicing',
      slug: 'ac-repair',
      description: 'High-pressure foam jet wash, filter deep cleansing, refrigerant leak check, and compressor diagnostic for Split and Window ACs.',
      image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'fixed',
      base_price: 349,
      min_price: 349,
      max_price: 349,
      per_unit_price: 0,
      inspection_fee: 0,
      per_km_price: 0,
      estimated_duration_mins: 60,
      service_radius_km: 25,
      requires_before_after_photos: 1,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'ac_type', label: 'AC Unit Type', type: 'select', options: ['Split AC', 'Window AC', 'Cassette / Tower AC'], required: true },
          { name: 'brand', label: 'Brand', type: 'select', options: ['Voltas', 'Daikin', 'LG', 'Samsung', 'Hitachi', 'Blue Star', 'Carrier', 'Other'], required: true },
          { name: 'problem', label: 'Primary Issue', type: 'select', options: ['Routine Jet Foam Service', 'Not Cooling Properly', 'Water Leakage from Indoor Unit', 'Strange Noise / Smell', 'Gas Top-up Inspection'], required: true },
          { name: 'units_count', label: 'Number of AC Units', type: 'number', default: 1, min: 1, max: 10, required: true }
        ]
      })
    },
    {
      id: 'srv_painting',
      category_id: 'cat_improvement',
      name: 'Wall & Home Painting',
      slug: 'painting',
      description: 'Professional wall putty, primer, and double-coat interior/exterior painting with dust-free sanding machines and furniture masking.',
      image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'per_unit',
      base_price: 1200,
      min_price: 10,
      max_price: 15,
      per_unit_price: 12, // per sq ft
      inspection_fee: 0,
      per_km_price: 0,
      estimated_duration_mins: 480,
      service_radius_km: 30,
      requires_before_after_photos: 1,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment / Flat', 'Independent Villa', 'Commercial / Office'], required: true },
          { name: 'approx_sqft', label: 'Estimated Carpet Area (sq ft)', type: 'number', default: 800, min: 100, max: 20000, required: true },
          { name: 'scope', label: 'Scope of Painting', type: 'select', options: ['Interior Walls Only', 'Exterior Walls Only', 'Full Interior + Exterior', 'Single Accent / Feature Wall'], required: true },
          { name: 'paint_preference', label: 'Paint Quality Preference', type: 'select', options: ['Economy (Tractor Emulsion)', 'Standard (Premium Satin)', 'Luxury (Royale Sheen / Washable)'], required: true }
        ]
      })
    },
    {
      id: 'srv_car_wash',
      category_id: 'cat_auto',
      name: 'Car Washing & Detailing',
      slug: 'car-washing',
      description: 'At-home exterior snow foam wash, underbody rinse, tire glossing, interior vacuuming, and dashboard UV polish.',
      image_url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'range',
      base_price: 249,
      min_price: 249,
      max_price: 299,
      per_unit_price: 0,
      inspection_fee: 0,
      per_km_price: 0,
      estimated_duration_mins: 45,
      service_radius_km: 20,
      requires_before_after_photos: 1,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'vehicle_type', label: 'Vehicle Segment', type: 'select', options: ['Hatchback (₹249)', 'Sedan / Compact SUV (₹299)', 'Full-size SUV / Luxury (₹349)'], required: true },
          { name: 'reg_number', label: 'Vehicle Registration Number', type: 'text', placeholder: 'E.g., KA 01 AB 1234', required: true },
          { name: 'package', label: 'Service Package', type: 'select', options: ['Exterior Foam Wash + Tire Dressing', 'Complete Deep Exterior & Interior Vacuum', 'Ceramic Spray Wax Booster'], required: true },
          { name: 'parking_spot', label: 'Vehicle Location', type: 'select', options: ['Covered Basement Parking', 'Open Society Parking', 'Street Parking Outside House'], required: true }
        ]
      })
    },
    {
      id: 'srv_appliance_rep',
      category_id: 'cat_repairs',
      name: 'Appliance Repair',
      slug: 'appliance-repair',
      description: 'Diagnostic and repair for washing machines, refrigerators, microwave ovens, water purifiers, and chimneys by verified technicians.',
      image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'inspection_plus_charges',
      base_price: 99,
      min_price: 99,
      max_price: 99,
      per_unit_price: 0,
      inspection_fee: 99,
      per_km_price: 0,
      estimated_duration_mins: 60,
      service_radius_km: 20,
      requires_before_after_photos: 1,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'appliance_type', label: 'Appliance', type: 'select', options: ['Washing Machine', 'Refrigerator / Fridge', 'Microwave Oven', 'RO / UV Water Purifier', 'Kitchen Chimney'], required: true },
          { name: 'brand_model', label: 'Brand & Model', type: 'text', placeholder: 'E.g., Samsung Front Load 7kg', required: true },
          { name: 'problem_desc', label: 'Describe the malfunction', type: 'textarea', placeholder: 'E.g., Drum not spinning, error code 4E displayed...', required: true }
        ]
      })
    },
    {
      id: 'srv_beauty',
      category_id: 'cat_beauty',
      name: 'Beauty Services at Home',
      slug: 'beauty-services',
      description: 'Hygienic, single-use kit salon services including threading, honey wax, herbal facial, manicure, pedicure, and head massage in your comfort.',
      image_url: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'range',
      base_price: 799,
      min_price: 799,
      max_price: 1299,
      per_unit_price: 0,
      inspection_fee: 0,
      per_km_price: 0,
      estimated_duration_mins: 90,
      service_radius_km: 15,
      requires_before_after_photos: 0,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'package', label: 'Service Package', type: 'select', options: ['Classic Glow Combo (Facial + Cleanup) ₹799', 'Head-to-Toe Care (Waxing + Mani-Pedi) ₹1,099', 'Royal Bridal Prep & Spa ₹1,299'], required: true },
          { name: 'gender', label: 'Client Gender', type: 'select', options: ['Female', 'Male'], required: true },
          { name: 'skin_sensitivity', label: 'Skin Allergies / Preferences', type: 'text', placeholder: 'E.g., Sensitive skin, prefer chocolate wax' }
        ]
      })
    },
    {
      id: 'srv_delivery',
      category_id: 'cat_logistics',
      name: 'Delivery / Courier',
      slug: 'delivery-courier',
      description: 'Instant point-to-point hyperlocal delivery of documents, forgotten keys, electronics, home food, and business parcels.',
      image_url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'base_plus_distance',
      base_price: 30, // ₹30 base
      min_price: 30,
      max_price: 500,
      per_unit_price: 0,
      inspection_fee: 0,
      per_km_price: 10, // ₹10 per km
      estimated_duration_mins: 45,
      service_radius_km: 35,
      requires_before_after_photos: 1,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'pickup_address', label: 'Pickup Location & Instructions', type: 'textarea', placeholder: 'Exact address, flat/tower, pickup point', required: true },
          { name: 'drop_address', label: 'Delivery Location', type: 'textarea', placeholder: 'Drop off landmark, flat number', required: true },
          { name: 'package_type', label: 'Package Contents', type: 'select', options: ['Documents / Envelope', 'Keys / Small Essentials', 'Box / Electronics', 'Food / Bakery item', 'Clothes / Laundry'], required: true },
          { name: 'weight_kg', label: 'Approximate Weight', type: 'select', options: ['Under 1 kg', '1 to 5 kg', '5 to 12 kg'], required: true },
          { name: 'recipient_contact', label: 'Recipient Mobile Number', type: 'tel', placeholder: '+91 98765 00000', required: true }
        ]
      })
    },
    {
      id: 'srv_moving',
      category_id: 'cat_logistics',
      name: 'Moving / Packing',
      slug: 'moving-packing',
      description: 'Stress-free home shifting with bubble wrap, corrugated boxes, furniture dismantling, safe transit tempo, and reassembly.',
      image_url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
      pricing_model: 'range',
      base_price: 3500,
      min_price: 3500,
      max_price: 4500,
      per_unit_price: 0,
      inspection_fee: 0,
      per_km_price: 0,
      estimated_duration_mins: 300,
      service_radius_km: 50,
      requires_before_after_photos: 1,
      form_schema_json: JSON.stringify({
        fields: [
          { name: 'bhk', label: 'Home Inventory Volume', type: 'select', options: ['1 BHK / Studio (₹3,500)', '2 BHK Standard (₹4,000)', '3 BHK Complete (₹4,500)', 'Villa / Independent (Custom)'], required: true },
          { name: 'destination_address', label: 'Destination Address', type: 'textarea', placeholder: 'Where are you shifting to?', required: true },
          { name: 'current_floor', label: 'Current Floor & Lift', type: 'select', options: ['Ground floor', 'Floor 1-3 with lift', 'Floor 1-3 NO lift', 'Floor 4+ with lift', 'Floor 4+ NO lift'], required: true },
          { name: 'destination_floor', label: 'Destination Floor & Lift', type: 'select', options: ['Ground floor', 'Floor 1-3 with lift', 'Floor 1-3 NO lift', 'Floor 4+ with lift', 'Floor 4+ NO lift'], required: true },
          { name: 'packing_required', label: 'Packing Type Required', type: 'select', options: ['Full Multi-Layer Packing (Bubble wrap + Cartons)', 'Fragile Items Only', 'Loading/Unloading Only (I have packed)'], required: true }
        ]
      })
    }
  ];

  for (const s of services) {
    await db.run(
      `INSERT INTO services (
        id, category_id, name, slug, description, image_url, pricing_model,
        base_price, min_price, max_price, per_unit_price, inspection_fee, per_km_price,
        estimated_duration_mins, service_radius_km, requires_before_after_photos,
        is_active, form_schema_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id, s.category_id, s.name, s.slug, s.description, s.image_url, s.pricing_model,
        s.base_price, s.min_price, s.max_price, s.per_unit_price, s.inspection_fee, s.per_km_price,
        s.estimated_duration_mins, s.service_radius_km, s.requires_before_after_photos,
        s.is_active ?? 1, s.form_schema_json
      ]
    );
  }

  // 5. Hash default passwords
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const customerPassword = await bcrypt.hash('Customer@123', 10);
  const workerPassword = await bcrypt.hash('Worker@123', 10);

  // 6. Admin Account
  const adminUserId = 'usr_admin_vikram';
  await db.run(
    `INSERT INTO users (id, email, mobile, password_hash, role, is_active, is_verified, two_factor_enabled, two_factor_secret)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [adminUserId, 'admin@sahaayak.com', '+919900011111', adminPassword, 'admin', 1, 1, 1, '123456']
  );
  await db.run(
    `INSERT INTO admins (id, user_id, full_name, department) VALUES (?, ?, ?, ?)`,
    ['adm_vikram', adminUserId, 'Vikram Malhotra', 'Operations & Trust']
  );

  // 7. Customers
  const customersData = [
    {
      userId: 'usr_cust_priya',
      customerId: 'cust_priya',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      mobile: '+919888811111',
      dob: '1994-05-14',
      gender: 'female',
      addresses: [
        {
          id: 'addr_priya_home',
          label: 'Home',
          house_no: 'Flat 402, Oakwood Heights',
          street: '14th Main Road, Sector 4',
          area: 'HSR Layout',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560102',
          landmark: 'Opposite BDA Complex',
          lat: 12.9121,
          lng: 77.6446,
          is_default: 1
        },
        {
          id: 'addr_priya_work',
          label: 'Office',
          house_no: 'Level 3, Helios Tech Park',
          street: 'Outer Ring Road',
          area: 'Kadubeesanahalli',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560103',
          landmark: 'Next to Cessna Tech Park',
          lat: 12.9360,
          lng: 77.6948,
          is_default: 0
        }
      ]
    },
    {
      userId: 'usr_cust_rahul',
      customerId: 'cust_rahul',
      name: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      mobile: '+919888822222',
      dob: '1990-11-22',
      gender: 'male',
      addresses: [
        {
          id: 'addr_rahul_home',
          label: 'Home',
          house_no: '#72, 5th Cross',
          street: '80 Feet Road, 4th Block',
          area: 'Koramangala',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560034',
          landmark: 'Near Sony World Signal',
          lat: 12.9352,
          lng: 77.6245,
          is_default: 1
        }
      ]
    },
    {
      userId: 'usr_cust_arun',
      customerId: 'cust_arun',
      name: 'Arun Patel',
      email: 'arun.patel@example.com',
      mobile: '+919888833333',
      dob: '1987-03-08',
      gender: 'male',
      addresses: [
        {
          id: 'addr_arun_home',
          label: 'Home',
          house_no: 'Villa 18, Palm Meadows',
          street: '100 Feet Road',
          area: 'Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
          landmark: 'Near Metro Station',
          lat: 12.9784,
          lng: 77.6408,
          is_default: 1
        }
      ]
    }
  ];

  for (const c of customersData) {
    await db.run(
      `INSERT INTO users (id, email, mobile, password_hash, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c.userId, c.email, c.mobile, customerPassword, 'customer', 1, 1]
    );
    await db.run(
      `INSERT INTO customers (id, user_id, full_name, dob, gender) VALUES (?, ?, ?, ?, ?)`,
      [c.customerId, c.userId, c.name, c.dob, c.gender]
    );
    for (const a of c.addresses) {
      await db.run(
        `INSERT INTO addresses (
          id, customer_id, label, house_no, building_name, street, area, city, state, pincode,
          landmark, latitude, longitude, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.id, c.customerId, a.label, a.house_no, a.building_name || '', a.street, a.area,
          a.city, a.state, a.pincode, a.landmark, a.lat, a.lng, a.is_default
        ]
      );
    }
  }

  // 8. Workers (Gig Workers across services)
  const workersData = [
    {
      userId: 'usr_wrk_ramesh',
      workerId: 'wrk_ramesh',
      name: 'Ramesh Kumar',
      email: 'ramesh.cleaner@example.com',
      mobile: '+919777711111',
      dob: '1988-08-15',
      gender: 'male',
      address: '22, Teachers Colony, HSR Layout',
      city: 'Bengaluru',
      pincode: '560102',
      experience_years: 7,
      skills: 'Deep Cleaning, Floor Polishing, Sanitization, Car Detailing',
      bio: 'Professional cleaner with over 7 years experience handling villas, corporate spaces, and luxury flats. Punctual and thorough.',
      service_radius_km: 20,
      languages: 'Hindi, Kannada, English',
      expected_working_hours: '08:00 - 20:00',
      bank_account_no: '918273645012',
      bank_ifsc: 'HDFC0001234',
      upi_id: 'rameshkumar@okhdfcbank',
      is_approved: 1,
      verification_status: 'approved',
      is_online: 1,
      max_daily_jobs: 5,
      performance_score: 96.5,
      avg_rating: 4.9,
      total_reviews: 48,
      total_completed_jobs: 54,
      total_declined_jobs: 1,
      total_cancelled_jobs: 0,
      lat: 12.9150,
      lng: 77.6400,
      serviceIds: ['srv_home_clean', 'srv_car_wash']
    },
    {
      userId: 'usr_wrk_suresh',
      workerId: 'wrk_suresh',
      name: 'Suresh Gowda',
      email: 'suresh.plumber@example.com',
      mobile: '+919777722222',
      dob: '1985-04-19',
      gender: 'male',
      address: '14, 1st Stage, BTM Layout',
      city: 'Bengaluru',
      pincode: '560068',
      experience_years: 10,
      skills: 'Plumbing, Concealed Piping, Electrical Wiring, Sanitary Fixtures',
      bio: 'Certified ITI electrician and master plumber. Specialize in quick leak detection and electrical faults.',
      service_radius_km: 25,
      languages: 'Kannada, Telugu, Hindi',
      expected_working_hours: '09:00 - 21:00',
      bank_account_no: '445566778899',
      bank_ifsc: 'SBIN0005678',
      upi_id: 'sureshgowda@oksbi',
      is_approved: 1,
      verification_status: 'approved',
      is_online: 1,
      max_daily_jobs: 6,
      performance_score: 94.0,
      avg_rating: 4.8,
      total_reviews: 39,
      total_completed_jobs: 44,
      total_declined_jobs: 2,
      total_cancelled_jobs: 1,
      lat: 12.9300,
      lng: 77.6200,
      serviceIds: ['srv_plumbing_elec', 'srv_appliance_rep']
    },
    {
      userId: 'usr_wrk_vikram',
      workerId: 'wrk_vikram',
      name: 'Vikram Singh',
      email: 'vikram.ac@example.com',
      mobile: '+919777733333',
      dob: '1992-09-25',
      gender: 'male',
      address: '88, Domlur Village',
      city: 'Bengaluru',
      pincode: '560071',
      experience_years: 6,
      skills: 'HVAC Diagnostics, Gas Charging, Jet Foam Wash, PCB Repair',
      bio: 'Trained HVAC specialist. Expert in all Japanese and Korean AC brands with certified pressure testing kits.',
      service_radius_km: 25,
      languages: 'Hindi, English, Punjabi',
      expected_working_hours: '08:30 - 19:30',
      bank_account_no: '112233445566',
      bank_ifsc: 'ICIC0009876',
      upi_id: 'vikramsingh@icici',
      is_approved: 1,
      verification_status: 'approved',
      is_online: 1,
      max_daily_jobs: 5,
      performance_score: 98.0,
      avg_rating: 4.95,
      total_reviews: 62,
      total_completed_jobs: 70,
      total_declined_jobs: 0,
      total_cancelled_jobs: 0,
      lat: 12.9400,
      lng: 77.6350,
      serviceIds: ['srv_ac_repair', 'srv_appliance_rep']
    },
    {
      userId: 'usr_wrk_anita',
      workerId: 'wrk_anita',
      name: 'Anita Rao',
      email: 'anita.beauty@example.com',
      mobile: '+919777744444',
      dob: '1993-12-03',
      gender: 'female',
      address: '5, 6th Sector, HSR Layout',
      city: 'Bengaluru',
      pincode: '560102',
      experience_years: 5,
      skills: 'Organic Facial, Rica Waxing, Bridal Makeup, Spa Pedicure',
      bio: 'Certified cosmetologist. Uses 100% sealed disposable kits and sterilized tools for utmost client hygiene.',
      service_radius_km: 18,
      languages: 'English, Kannada, Hindi',
      expected_working_hours: '10:00 - 18:00',
      bank_account_no: '556677889900',
      bank_ifsc: 'AXIS0004321',
      upi_id: 'anitarao@axisbank',
      is_approved: 1,
      verification_status: 'approved',
      is_online: 1,
      max_daily_jobs: 4,
      performance_score: 99.0,
      avg_rating: 5.0,
      total_reviews: 31,
      total_completed_jobs: 33,
      total_declined_jobs: 0,
      total_cancelled_jobs: 0,
      lat: 12.9200,
      lng: 77.6500,
      serviceIds: ['srv_beauty']
    },
    {
      userId: 'usr_wrk_mohit',
      workerId: 'wrk_mohit',
      name: 'Mohit Deshmukh',
      email: 'mohit.mover@example.com',
      mobile: '+919777755555',
      dob: '1989-06-11',
      gender: 'male',
      address: '33, Wilson Garden',
      city: 'Bengaluru',
      pincode: '560027',
      experience_years: 8,
      skills: 'Heavy Packing, Furniture Disassembly, Express Courier, Logistics',
      bio: 'Logistics and shifting pro. Fleet of well-maintained commercial vehicles with trained helpers.',
      service_radius_km: 40,
      languages: 'Hindi, Marathi, Kannada',
      expected_working_hours: '07:00 - 22:00',
      bank_account_no: '778899001122',
      bank_ifsc: 'KKBK0001122',
      upi_id: 'mohitdeshmukh@kotak',
      is_approved: 1,
      verification_status: 'approved',
      is_online: 1,
      max_daily_jobs: 4,
      performance_score: 92.0,
      avg_rating: 4.75,
      total_reviews: 24,
      total_completed_jobs: 28,
      total_declined_jobs: 1,
      total_cancelled_jobs: 1,
      lat: 12.9450,
      lng: 77.6000,
      serviceIds: ['srv_moving', 'srv_delivery']
    },
    {
      userId: 'usr_wrk_kiran',
      workerId: 'wrk_kiran',
      name: 'Kiran Joshi',
      email: 'kiran.pending@example.com',
      mobile: '+919777766666',
      dob: '1995-02-18',
      gender: 'male',
      address: '102, Shanti Nagar',
      city: 'Bengaluru',
      pincode: '560027',
      experience_years: 3,
      skills: 'Wall Putty, Roller Painting, Texture Finish',
      bio: 'Seeking onboarding to offer modern wall textures and spray painting.',
      service_radius_km: 20,
      languages: 'Hindi, English',
      expected_working_hours: '09:00 - 18:00',
      bank_account_no: '889900112233',
      bank_ifsc: 'PUNB0004567',
      upi_id: 'kiranpainting@okpnb',
      is_approved: 0,
      verification_status: 'pending', // In Admin Verification Queue!
      is_online: 0,
      max_daily_jobs: 3,
      performance_score: 85.0,
      avg_rating: 5.0,
      total_reviews: 0,
      total_completed_jobs: 0,
      total_declined_jobs: 0,
      total_cancelled_jobs: 0,
      lat: 12.9600,
      lng: 77.5950,
      serviceIds: ['srv_painting']
    }
  ];

  for (const w of workersData) {
    await db.run(
      `INSERT INTO users (id, email, mobile, password_hash, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [w.userId, w.email, w.mobile, workerPassword, 'worker', 1, w.is_approved]
    );

    await db.run(
      `INSERT INTO workers (
        id, user_id, full_name, dob, gender, address, city, pincode, experience_years,
        skills, bio, service_radius_km, languages, expected_working_hours,
        bank_account_no, bank_ifsc, upi_id, is_approved, verification_status,
        is_online, max_daily_jobs, performance_score, avg_rating, total_reviews,
        total_completed_jobs, total_declined_jobs, total_cancelled_jobs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        w.workerId, w.userId, w.name, w.dob, w.gender, w.address, w.city, w.pincode, w.experience_years,
        w.skills, w.bio, w.service_radius_km, w.languages, w.expected_working_hours,
        w.bank_account_no, w.bank_ifsc, w.upi_id, w.is_approved, w.verification_status,
        w.is_online, w.max_daily_jobs, w.performance_score, w.avg_rating, w.total_reviews,
        w.total_completed_jobs, w.total_declined_jobs, w.total_cancelled_jobs
      ]
    );

    // Location
    await db.run(
      `INSERT INTO worker_locations (id, worker_id, latitude, longitude) VALUES (?, ?, ?, ?)`,
      ['loc_' + w.workerId, w.workerId, w.lat, w.lng]
    );

    // Services mapping
    for (const sid of w.serviceIds) {
      await db.run(
        `INSERT INTO worker_services (id, worker_id, service_id) VALUES (?, ?, ?)`,
        ['ws_' + w.workerId + '_' + sid, w.workerId, sid]
      );
    }

    // Performance record
    await db.run(
      `INSERT INTO worker_performance (
        id, worker_id, completed_jobs_count, declined_jobs_count, cancelled_jobs_count,
        total_assigned_count, calculated_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'wp_' + w.workerId, w.workerId, w.total_completed_jobs, w.total_declined_jobs,
        w.total_cancelled_jobs, w.total_completed_jobs + w.total_declined_jobs, w.performance_score
      ]
    );

    // Add sample identity document
    await db.run(
      `INSERT INTO worker_documents (id, worker_id, document_type, document_number, file_url, is_verified)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['doc_' + w.workerId, w.workerId, 'aadhaar', 'XXXX-XXXX-4921', '/uploads/demo-aadhaar.png', w.is_approved]
    );
  }

  // 9. Sample Bookings in Different Lifecycle Stages
  
  // Booking 1: Completed Home Cleaning with Payment, Tip, and 5-Star Review
  const b1Id = 'bk_1001';
  await db.run(
    `INSERT INTO bookings (
      id, booking_number, customer_id, worker_id, service_id, address_id, status,
      scheduled_date, scheduled_time, dynamic_fields_json, customer_notes,
      before_photos_json, after_photos_json, base_service_amount, total_labour_amount,
      total_parts_amount, tip_amount, commission_amount, final_amount, payment_method,
      payment_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      b1Id, 'SHK-2026-001', 'cust_priya', 'wrk_ramesh', 'srv_home_clean', 'addr_priya_home',
      'booking_closed', '2026-09-14', '10:00 AM',
      JSON.stringify({ bhk: '3 BHK', bathrooms: 3, house_size_sqft: 1500, requirements: 'Kitchen deep degrease and balcony scrubbing' }),
      'Please bring eco-friendly cleaning solutions.',
      JSON.stringify(['https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=400&q=80']),
      JSON.stringify(['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80']),
      2199, 2199, 0, 100, 219.9, 2299, 'upi', 'completed',
      '2026-09-14 09:30:00', '2026-09-14 13:45:00'
    ]
  );

  // Booking 1 Payment
  const p1Id = 'pay_1001';
  await db.run(
    `INSERT INTO payments (
      id, payment_number, booking_id, customer_id, worker_id, service_labour_amount,
      parts_materials_amount, tip_amount, platform_commission_amount, total_amount,
      payment_method, payment_status, transaction_reference, paid_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p1Id, 'PAY-SHK-001', b1Id, 'cust_priya', 'wrk_ramesh', 2199, 0, 100, 219.9, 2299,
      'upi', 'completed', 'UPI/20260914/998811', '2026-09-14 13:30:00'
    ]
  );

  // Booking 1 Commission (Labour ₹2199 > ₹599 => 10% commission applied on labour)
  await db.run(
    `INSERT INTO commissions (id, booking_id, payment_id, worker_id, labour_amount, commission_rate, commission_amount, rule_applied)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['comm_1001', b1Id, p1Id, 'wrk_ramesh', 2199, 10.0, 219.9, 'Standard rule: 10% on labour > ₹599']
  );

  // Booking 1 Tip (₹100, 100% to worker)
  await db.run(
    `INSERT INTO tips (id, booking_id, payment_id, customer_id, worker_id, amount)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['tip_1001', b1Id, p1Id, 'cust_priya', 'wrk_ramesh', 100]
  );

  // Booking 1 Rating & Review
  await db.run(
    `INSERT INTO ratings (id, booking_id, rated_by_user_id, target_user_id, rating_type, overall_rating, quality_rating, punctuality_rating, behaviour_rating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['rat_1001', b1Id, 'usr_cust_priya', 'usr_wrk_ramesh', 'customer_to_worker', 5, 5, 5, 5]
  );
  await db.run(
    `INSERT INTO reviews (id, booking_id, reviewer_user_id, reviewee_user_id, review_type, rating, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['rev_1001', b1Id, 'usr_cust_priya', 'usr_wrk_ramesh', 'customer_to_worker', 5, 'Ramesh did an outstanding job! The tiles and kitchen look brand new. Very polite and completed on time.']
  );

  // Booking 1 Invoice
  await db.run(
    `INSERT INTO invoices (id, invoice_number, booking_id, payment_id, invoice_data_json)
     VALUES (?, ?, ?, ?, ?)`,
    [
      'inv_1001', 'INV-2026-0001', b1Id, p1Id,
      JSON.stringify({
        invoice_number: 'INV-2026-0001',
        date: '2026-09-14',
        customer_name: 'Priya Sharma',
        customer_email: 'priya.sharma@example.com',
        worker_name: 'Ramesh Kumar',
        service_name: 'Home Cleaning (3 BHK Deep Clean)',
        service_labour_amount: 2199,
        parts_amount: 0,
        tip_amount: 100,
        platform_fee: 219.9,
        total_paid: 2299,
        payment_method: 'UPI'
      })
    ]
  );

  // Booking 2: Active Plumbing Job (Service Started)
  const b2Id = 'bk_1002';
  await db.run(
    `INSERT INTO bookings (
      id, booking_number, customer_id, worker_id, service_id, address_id, status,
      scheduled_date, scheduled_time, dynamic_fields_json, customer_notes,
      base_service_amount, total_labour_amount, total_parts_amount, tip_amount,
      commission_amount, final_amount, payment_method, payment_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      b2Id, 'SHK-2026-002', 'cust_rahul', 'wrk_suresh', 'srv_plumbing_elec', 'addr_rahul_home',
      'service_started', '2026-09-16', '02:00 PM',
      JSON.stringify({ problem_type: 'Pipe Leakage / Drain Block', description: 'Under-sink kitchen drain pipe is leaking water rapidly', urgency: 'Standard' }),
      'Please call when you reach the gate.',
      99, 99, 0, 0, 0, 99, 'cash', 'pending',
      '2026-09-16 11:00:00', '2026-09-16 14:15:00'
    ]
  );

  // Additional charge request on Booking 2 (e.g. ₹250 replacement PVC pipe)
  await db.run(
    `INSERT INTO additional_charge_requests (id, booking_id, worker_id, description, labour_amount, parts_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['acr_1002', b2Id, 'wrk_suresh', 'Heavy-duty 1.5-inch PVC flexible drain pipe & silicone sealant', 100, 250, 'pending']
  );

  // Sample Chat Messages between Rahul and Suresh
  await db.run(
    `INSERT INTO messages (id, booking_id, sender_user_id, receiver_user_id, message_text, is_read)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['msg_1001', b2Id, 'usr_cust_rahul', 'usr_wrk_suresh', 'Hi Suresh ji, I am on the 2nd floor, flat 204.', 1]
  );
  await db.run(
    `INSERT INTO messages (id, booking_id, sender_user_id, receiver_user_id, message_text, is_read)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['msg_1002', b2Id, 'usr_wrk_suresh', 'usr_cust_rahul', 'Namaste Rahul ji. I have arrived at your building and starting the pipe inspection now.', 1]
  );

  // Booking 3: Pending Job Request assigned to Vikram Singh (AC Repair)
  const b3Id = 'bk_1003';
  await db.run(
    `INSERT INTO bookings (
      id, booking_number, customer_id, worker_id, service_id, address_id, status,
      scheduled_date, scheduled_time, dynamic_fields_json, customer_notes,
      base_service_amount, total_labour_amount, total_parts_amount, final_amount,
      payment_method, payment_status, assignment_attempts, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      b3Id, 'SHK-2026-003', 'cust_arun', 'wrk_vikram', 'srv_ac_repair', 'addr_arun_home',
      'worker_assigned', '2026-09-16', '04:30 PM',
      JSON.stringify({ ac_type: 'Split AC', brand: 'Daikin', problem: 'Routine Jet Foam Service', units_count: 1 }),
      'Please carry an extension cord.',
      349, 349, 0, 349, 'upi', 'pending', 1,
      '2026-09-16 14:30:00', '2026-09-16 14:30:00'
    ]
  );

  // Booking 4: Past booking with a Customer Complaint for Admin investigation
  const b4Id = 'bk_1004';
  await db.run(
    `INSERT INTO bookings (
      id, booking_number, customer_id, worker_id, service_id, address_id, status,
      scheduled_date, scheduled_time, dynamic_fields_json, customer_notes,
      base_service_amount, total_labour_amount, total_parts_amount, final_amount,
      payment_method, payment_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      b4Id, 'SHK-2026-004', 'cust_arun', 'wrk_mohit', 'srv_delivery', 'addr_arun_home',
      'disputed', '2026-09-15', '11:00 AM',
      JSON.stringify({ package_type: 'Box / Electronics', weight_kg: '1 to 5 kg', recipient_contact: '+919876543210' }),
      'Handle with care, contains fragile ceramic decor.',
      120, 120, 0, 120, 'card', 'completed',
      '2026-09-15 10:00:00', '2026-09-15 15:00:00'
    ]
  );

  // Complaint on Booking 4
  await db.run(
    `INSERT INTO complaints (
      id, complaint_number, booking_id, filed_by_user_id, against_user_id, category,
      description, status, priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'cmp_1001', 'CMP-2026-001', b4Id, 'usr_cust_arun', 'usr_wrk_mohit', 'Damaged property',
      'The outer carton was crushed during transit and one ceramic mug inside was cracked. Requesting reimbursement.',
      'investigating', 'high'
    ]
  );

  // 10. Notifications
  await db.run(
    `INSERT INTO notifications (id, user_id, title, message, type, category, related_booking_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'ntf_1001', 'usr_cust_priya', 'Service Completed & Paid',
      'Your Home Cleaning service has been marked complete. Thank you for using Sahaayak!',
      'success', 'booking', b1Id
    ]
  );
  await db.run(
    `INSERT INTO notifications (id, user_id, title, message, type, category, related_booking_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'ntf_1002', 'usr_wrk_vikram', 'New Job Assignment Request',
      'You have been assigned an AC Repair service in Indiranagar. Please accept within 45s.',
      'info', 'assignment', b3Id
    ]
  );
  await db.run(
    `INSERT INTO notifications (id, user_id, title, message, type, category, related_booking_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'ntf_1003', 'usr_admin_vikram', 'Dispute Alert: CMP-2026-001',
      'Customer Arun Patel reported damaged property on delivery booking SHK-2026-004.',
      'warning', 'complaint', b4Id
    ]
  );

  // 11. Sample Audit Logs
  await db.run(
    `INSERT INTO audit_logs (id, admin_user_id, action, entity, entity_id, previous_value_json, new_value_json, reason, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'aud_1001', 'usr_admin_vikram', 'WORKER_APPROVED', 'workers', 'wrk_ramesh',
      JSON.stringify({ verification_status: 'pending', is_approved: 0 }),
      JSON.stringify({ verification_status: 'approved', is_approved: 1 }),
      'All Aadhaar and bank details successfully verified against National KYC standard.',
      '127.0.0.1'
    ]
  );
  await db.run(
    `INSERT INTO audit_logs (id, admin_user_id, action, entity, entity_id, previous_value_json, new_value_json, reason, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'aud_1002', 'usr_admin_vikram', 'COMMISSION_CONFIG_UPDATE', 'system_settings', 'set_commission',
      JSON.stringify({ threshold_amount: 500, commission_percentage: 12 }),
      JSON.stringify({ threshold_amount: 599, commission_percentage: 10 }),
      'Implemented fair worker protection policy: ₹0 platform fee up to ₹599.',
      '127.0.0.1'
    ]
  );

  console.log('[SEED] Database populated with full realistic seed data!');
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('[INIT] Database setup complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[INIT] Error during setup:', err);
      process.exit(1);
    });
}

module.exports = { initDatabase, seedData };
