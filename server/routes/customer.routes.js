const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('customer'));

// Get Customer Profile
router.get('/profile', async (req, res) => {
  try {
    const customer = await db.get(
      `SELECT c.*, u.email, u.mobile, u.avatar_url
       FROM customers c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ?`,
      [req.user.id]
    );

    const addresses = await db.query(
      'SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
      [customer.id]
    );

    res.json({ profile: customer, addresses });
  } catch (err) {
    console.error('[Customer Profile GET] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Update Customer Profile
router.put('/profile', async (req, res) => {
  try {
    const { fullName, dob, gender, mobile } = req.body;
    const customer = req.user.profile;

    await db.run(
      'UPDATE customers SET full_name = ?, dob = ?, gender = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [fullName || customer.full_name, dob || null, gender || null, customer.id]
    );

    if (mobile) {
      await db.run('UPDATE users SET mobile = ? WHERE id = ?', [mobile, req.user.id]);
    }

    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('[Customer Profile PUT] Error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Get Addresses
router.get('/addresses', async (req, res) => {
  try {
    const addresses = await db.query(
      'SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.profile.id]
    );
    res.json({ addresses });
  } catch (err) {
    console.error('[Addresses GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch addresses.' });
  }
});

// Add Address (Automatic mock geocoding if lat/lng is missing)
router.post('/addresses', async (req, res) => {
  try {
    const { label, houseNo, buildingName, street, area, city, state, pincode, landmark, latitude, longitude, isDefault } = req.body;

    if (!houseNo || !street || !area || !city || !pincode) {
      return res.status(400).json({ error: 'House number, street, area, city, and pincode are required.' });
    }

    const customerId = req.user.profile.id;

    // If default is checked, reset other defaults
    if (isDefault) {
      await db.run('UPDATE addresses SET is_default = 0 WHERE customer_id = ?', [customerId]);
    }

    // Geocode fallback if not provided by map picker
    const lat = Number(latitude) || (12.9100 + (Math.random() * 0.05));
    const lng = Number(longitude) || (77.6200 + (Math.random() * 0.05));

    const addressId = 'addr_' + uuidv4().replace(/-/g, '').substring(0, 10);

    await db.run(
      `INSERT INTO addresses (
        id, customer_id, label, house_no, building_name, street, area, city, state, pincode,
        landmark, latitude, longitude, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        addressId, customerId, label || 'Home', houseNo, buildingName || '', street, area,
        city, state || 'Karnataka', pincode, landmark || '', lat, lng, isDefault ? 1 : 0
      ]
    );

    const newAddress = await db.get('SELECT * FROM addresses WHERE id = ?', [addressId]);
    res.status(201).json({ message: 'Address saved successfully.', address: newAddress });
  } catch (err) {
    console.error('[Address POST] Error:', err);
    res.status(500).json({ error: 'Failed to save address.' });
  }
});

// Delete Address
router.delete('/addresses/:id', async (req, res) => {
  try {
    await db.run(
      'DELETE FROM addresses WHERE id = ? AND customer_id = ?',
      [req.params.id, req.user.profile.id]
    );
    res.json({ message: 'Address removed successfully.' });
  } catch (err) {
    console.error('[Address DELETE] Error:', err);
    res.status(500).json({ error: 'Failed to delete address.' });
  }
});

// Safe Account Deactivation
router.post('/deactivate', async (req, res) => {
  try {
    // Soft deactivation to preserve transactional booking records
    await db.run('UPDATE users SET is_active = 0 WHERE id = ?', [req.user.id]);
    res.json({ message: 'Your account has been deactivated.' });
  } catch (err) {
    console.error('[Account Deactivation] Error:', err);
    res.status(500).json({ error: 'Deactivation failed.' });
  }
});

module.exports = router;
