const express = require('express');
const router = express.Router();
const db = require('../database/db');

// List all active services
router.get('/', async (req, res) => {
  try {
    const services = await db.query(
      `SELECT s.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
       FROM services s
       JOIN service_categories c ON s.category_id = c.id
       WHERE s.is_active = 1
       ORDER BY c.display_order ASC, s.name ASC`
    );

    const parsed = services.map(s => {
      let formSchema = { fields: [] };
      try {
        if (s.form_schema_json) formSchema = JSON.parse(s.form_schema_json);
      } catch (e) {}
      return { ...s, formSchema };
    });

    res.json({ services: parsed });
  } catch (err) {
    console.error('[Services GET] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

// List all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM service_categories ORDER BY display_order ASC');
    res.json({ categories });
  } catch (err) {
    console.error('[Categories GET] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// Get single service by ID or Slug
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const service = await db.get(
      `SELECT s.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
       FROM services s
       JOIN service_categories c ON s.category_id = c.id
       WHERE (s.id = ? OR s.slug = ?) AND s.is_active = 1`,
      [slugOrId, slugOrId]
    );

    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    let formSchema = { fields: [] };
    try {
      if (service.form_schema_json) formSchema = JSON.parse(service.form_schema_json);
    } catch (e) {}

    res.json({ service: { ...service, formSchema } });
  } catch (err) {
    console.error('[Service GET single] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve service.' });
  }
});

module.exports = router;
