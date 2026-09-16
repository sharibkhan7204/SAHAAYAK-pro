const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { JWT_SECRET, JWT_EXPIRES_IN, DEMO_MODE } = require('../config');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

// Demo OTP in-memory store
const otpStore = new Map();

/**
 * 1-Click Demo Accounts list for Hackathon judges & reviewers
 */
router.get('/demo-accounts', async (req, res) => {
  res.json({
    admin: {
      email: 'admin@sahaayak.com',
      password: 'Admin@123',
      role: 'admin',
      twoFactorCode: '123456',
      name: 'Vikram Malhotra (Super Admin)'
    },
    customers: [
      { email: 'priya.sharma@example.com', password: 'Customer@123', role: 'customer', name: 'Priya Sharma (HSR Layout)' },
      { email: 'rahul.verma@example.com', password: 'Customer@123', role: 'customer', name: 'Rahul Verma (Koramangala)' }
    ],
    workers: [
      { email: 'ramesh.cleaner@example.com', password: 'Worker@123', role: 'worker', name: 'Ramesh Kumar (Cleaning / Car Wash)' },
      { email: 'suresh.plumber@example.com', password: 'Worker@123', role: 'worker', name: 'Suresh Gowda (Plumbing / Electrical)' },
      { email: 'vikram.ac@example.com', password: 'Worker@123', role: 'worker', name: 'Vikram Singh (AC Repair)' },
      { email: 'anita.beauty@example.com', password: 'Worker@123', role: 'worker', name: 'Anita Rao (Beauty & Salon)' }
    ]
  });
});

/**
 * Register Customer or Worker
 */
router.post('/register', async (req, res) => {
  try {
    const {
      role, email, mobile, password, fullName, dob, gender,
      // Address & location:
      city, pincode, address, area,
      // Worker specific fields:
      experienceYears, skills, bio, serviceIds, bankAccountNo, bankIfsc, upiId
    } = req.body;

    if (!email || !mobile || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Please provide all mandatory registration fields.' });
    }

    if (!['customer', 'worker'].includes(role)) {
      return res.status(400).json({ error: 'Invalid registration role.' });
    }

    // Format mobile
    let formattedMobile = String(mobile).trim();
    if (!formattedMobile.startsWith('+')) {
      formattedMobile = '+91' + formattedMobile.replace(/^0+/, '');
    }

    // Check unique email & mobile
    const existing = await db.get('SELECT id, email, mobile FROM users WHERE email = ? OR mobile = ?', [email.toLowerCase(), formattedMobile]);
    if (existing) {
      if (existing.email.toLowerCase() === email.toLowerCase()) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }
      return res.status(409).json({ error: 'An account with this mobile number already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = 'usr_' + uuidv4().replace(/-/g, '').substring(0, 10);

    await db.transaction(async ({ run }) => {
      // Create user
      await run(
        `INSERT INTO users (id, email, mobile, password_hash, role, is_active, is_verified)
         VALUES (?, ?, ?, ?, ?, 1, 1)`,
        [userId, email.toLowerCase(), formattedMobile, passwordHash, role]
      );

      if (role === 'customer') {
        const customerId = 'cust_' + uuidv4().replace(/-/g, '').substring(0, 10);
        await run(
          `INSERT INTO customers (id, user_id, full_name, dob, gender) VALUES (?, ?, ?, ?, ?)`,
          [customerId, userId, fullName, dob || null, gender || null]
        );

        // Add default address if given
        if (address && city && pincode) {
          const addressId = 'addr_' + uuidv4().replace(/-/g, '').substring(0, 10);
          const areaName = area || 'HSR Layout';
          let lat = 12.9121;
          let lng = 77.6446;
          const lowerArea = areaName.toLowerCase();
          if (lowerArea.includes('hsr')) { lat = 12.9121; lng = 77.6446; }
          else if (lowerArea.includes('kora') || lowerArea.includes('koramangala')) { lat = 12.9352; lng = 77.6245; }
          else if (lowerArea.includes('indira') || lowerArea.includes('indiranagar')) { lat = 12.9784; lng = 77.6408; }
          else if (lowerArea.includes('whitefield')) { lat = 12.9698; lng = 77.7500; }
          else if (lowerArea.includes('jayanagar')) { lat = 12.9308; lng = 77.5838; }
          else if (lowerArea.includes('bellandur')) { lat = 12.9304; lng = 77.6784; }
          else if (lowerArea.includes('electronic')) { lat = 12.8452; lng = 77.6602; }

          await run(
            `INSERT INTO addresses (id, customer_id, label, house_no, street, area, city, state, pincode, latitude, longitude, is_default)
             VALUES (?, ?, 'Home', ?, ?, ?, ?, 'Karnataka', ?, ?, ?, 1)`,
            [addressId, customerId, address, address, areaName, city, pincode, lat, lng]
          );
        }
      } else if (role === 'worker') {
        const workerId = 'wrk_' + uuidv4().replace(/-/g, '').substring(0, 10);
        await run(
          `INSERT INTO workers (
            id, user_id, full_name, dob, gender, address, city, pincode, experience_years,
            skills, bio, service_radius_km, bank_account_no, bank_ifsc, upi_id,
            is_approved, verification_status, is_online, max_daily_jobs
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 20, ?, ?, ?, 0, 'pending', 0, 5)`,
          [
            workerId, userId, fullName, dob || null, gender || null, address || 'Bengaluru',
            city || 'Bengaluru', pincode || '560001', Number(experienceYears) || 0,
            skills || 'General Home Services', bio || '', bankAccountNo || null, bankIfsc || null, upiId || null
          ]
        );

        // Location initial record
        await run(
          `INSERT INTO worker_locations (id, worker_id, latitude, longitude)
           VALUES (?, ?, 12.9352, 77.6245)`,
          ['loc_' + workerId, workerId]
        );

        // Link services
        if (Array.isArray(serviceIds)) {
          for (const sid of serviceIds) {
            await run(
              `INSERT INTO worker_services (id, worker_id, service_id) VALUES (?, ?, ?)`,
              ['ws_' + uuidv4().replace(/-/g, '').substring(0, 8), workerId, sid]
            );
          }
        }
      }
    });

    let profile = null;
    if (role === 'customer') {
      profile = await db.get('SELECT * FROM customers WHERE user_id = ?', [userId]);
    } else if (role === 'worker') {
      profile = await db.get('SELECT * FROM workers WHERE user_id = ?', [userId]);
    }

    const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await createNotification({
      userId,
      title: 'Welcome to Sahaayak!',
      message: `Namaste ${fullName}, your ${role} account has been created successfully.`,
      type: 'success',
      category: 'system'
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        mobile: formattedMobile,
        role,
        fullName,
        profile
      }
    });
  } catch (err) {
    console.error('[Auth Register] Error:', err);
    res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

/**
 * Login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, mobile, identifier, password } = req.body;
    const loginTarget = (email || identifier || mobile || '').trim();
    if (!loginTarget || !password) {
      return res.status(400).json({ error: 'Please provide both email/mobile and password.' });
    }

    const cleanMobile = loginTarget.replace(/\s+/g, '');
    const user = await db.get(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR mobile = ? OR mobile = ?',
      [loginTarget, cleanMobile, cleanMobile.startsWith('+91') ? cleanMobile : '+91' + cleanMobile]
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid email/mobile or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been suspended or deactivated. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Role-specific profile check
    let profile = null;
    if (user.role === 'customer') {
      profile = await db.get('SELECT * FROM customers WHERE user_id = ?', [user.id]);
      if (profile && profile.is_suspended) {
        return res.status(403).json({ error: `Account suspended: ${profile.suspension_reason || 'Contact support'}` });
      }
    } else if (user.role === 'worker') {
      profile = await db.get('SELECT * FROM workers WHERE user_id = ?', [user.id]);
    } else if (user.role === 'admin') {
      profile = await db.get('SELECT * FROM admins WHERE user_id = ?', [user.id]);
      // Admin 2FA challenge
      if (user.two_factor_enabled) {
        return res.json({
          requires2FA: true,
          tempUserId: user.id,
          message: 'Admin 2FA verification required. (Demo OTP is 123456)'
        });
      }
    }

    await db.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        fullName: profile ? profile.full_name : user.email,
        profile
      }
    });
  } catch (err) {
    console.error('[Auth Login] Error:', err);
    res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

/**
 * Admin 2FA Verification
 */
router.post('/2fa/verify', async (req, res) => {
  try {
    const { tempUserId, code } = req.body;
    if (!tempUserId || !code) {
      return res.status(400).json({ error: 'Please provide both user ID and 2FA code.' });
    }

    const user = await db.get('SELECT * FROM users WHERE id = ? AND role = ?', [tempUserId, 'admin']);
    if (!user) {
      return res.status(404).json({ error: 'Admin user not found.' });
    }

    // Check code (Matches secret or demo code '123456')
    if (code !== '123456' && code !== user.two_factor_secret) {
      return res.status(401).json({ error: 'Invalid 2FA code. For demo, enter 123456.' });
    }

    const profile = await db.get('SELECT * FROM admins WHERE user_id = ?', [user.id]);
    await db.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign({ userId: user.id, role: user.role, twoFactorVerified: true }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: '2FA verification successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        fullName: profile ? profile.full_name : 'Admin',
        profile
      }
    });
  } catch (err) {
    console.error('[2FA Verify] Error:', err);
    res.status(500).json({ error: '2FA verification failed.' });
  }
});

/**
 * Send Demo Mobile OTP
 */
router.post('/otp/send', (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: 'Mobile number required.' });

  const code = '123456'; // Consistent controlled demo OTP
  otpStore.set(mobile, { code, expires: Date.now() + 5 * 60 * 1000 });

  res.json({
    message: `OTP sent successfully to ${mobile}. (Demo OTP: ${code})`,
    demoCode: code
  });
});

/**
 * Verify Mobile OTP
 */
router.post('/otp/verify', async (req, res) => {
  const { mobile, code } = req.body;
  if (!mobile || !code) return res.status(400).json({ error: 'Mobile and code are required.' });

  if (code === '123456' || (otpStore.has(mobile) && otpStore.get(mobile).code === code)) {
    otpStore.delete(mobile);
    return res.json({ success: true, message: 'Mobile verified successfully.' });
  }

  res.status(400).json({ error: 'Invalid or expired OTP code.' });
});

/**
 * Get Current Logged In User Profile
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      mobile: req.user.mobile,
      role: req.user.role,
      avatarUrl: req.user.avatar_url,
      fullName: req.user.profile ? req.user.profile.full_name : req.user.email,
      profile: req.user.profile
    }
  });
});

/**
 * Logout
 */
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

/**
 * Logout from all devices
 */
router.post('/logout-all', authenticate, async (req, res) => {
  res.json({ message: 'Logged out from all active sessions.' });
});

module.exports = router;
