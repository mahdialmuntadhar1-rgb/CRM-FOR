// =====================================================
// Contacts API Routes
// CRUD + Import operations for business contacts
// =====================================================

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { normalizePhone, batchNormalizePhones, isOptOutKeyword } from '@whatsapp-crm/shared';
import type { ContactInsert, ImportPreview, ImportResult } from '@whatsapp-crm/shared';

const router = Router();

// =====================================================
// GET /api/contacts - List contacts with filters
// =====================================================
router.get('/', async (req, res) => {
  try {
    const { 
      governorate, 
      category, 
      status, 
      search, 
      limit = 50, 
      offset = 0,
      opted_out
    } = req.query;

    let query = supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact' });

    if (governorate) query = query.eq('governorate', governorate);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('whatsapp_status', status);
    if (opted_out !== undefined) query = query.eq('opted_out', opted_out === 'true');
    
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,normalized_phone.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      total: count || 0,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      pageSize: Number(limit),
      hasMore: (count || 0) > Number(offset) + Number(limit)
    });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch contacts' 
    });
  }
});

// =====================================================
// GET /api/contacts/:id - Get single contact
// =====================================================
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*, messages(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching contact:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch contact' 
    });
  }
});

// =====================================================
// POST /api/contacts - Create new contact
// =====================================================
router.post('/', async (req, res) => {
  try {
    const { business_name, raw_phone, ...rest } = req.body;

    if (!business_name || !raw_phone) {
      return res.status(400).json({
        success: false,
        error: 'business_name and raw_phone are required'
      });
    }

    // Normalize phone
    const phoneResult = normalizePhone(raw_phone);
    if (!phoneResult.isValid || !phoneResult.normalized) {
      return res.status(400).json({
        success: false,
        error: `Invalid phone number: ${phoneResult.reason}`
      });
    }

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('normalized_phone', phoneResult.normalized)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Contact with this phone number already exists',
        contactId: existing.id
      });
    }

    const contactData: ContactInsert = {
      business_name,
      raw_phone,
      normalized_phone: phoneResult.normalized,
      whatsapp_status: 'unknown',
      source: 'manual',
      ...rest
    };

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create contact' 
    });
  }
});

// =====================================================
// POST /api/contacts/import-preview - Preview CSV import
// =====================================================
router.post('/import-preview', async (req, res) => {
  try {
    const { rows } = req.body; // Array of { business_name, phone, ... }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No rows provided for preview'
      });
    }

    const phones = rows.map(r => r.phone || r.normalized_phone || r.raw_phone);
    const batchResult = batchNormalizePhones(phones);

    // Check for existing contacts
    const { data: existingContacts } = await supabaseAdmin
      .from('contacts')
      .select('normalized_phone')
      .in('normalized_phone', batchResult.valid);

    const existingPhones = new Set(existingContacts?.map(c => c.normalized_phone) || []);
    const newValidPhones = batchResult.valid.filter(p => !existingPhones.has(p));

    const preview: ImportPreview = {
      totalRows: rows.length,
      validNumbers: batchResult.valid.length,
      duplicates: batchResult.duplicates.length + existingPhones.size,
      invalids: batchResult.invalid.length,
      readyToSend: newValidPhones.length,
      sample: rows.slice(0, 5).map((r, i) => ({
        business_name: r.business_name,
        normalized_phone: batchResult.results.get(r.phone || r.raw_phone)?.normalized || null,
        governorate: r.governorate,
        category: r.category
      })),
      errors: batchResult.invalid.map((inv, i) => ({
        row: i + 1,
        reason: inv.reason
      }))
    };

    res.json({ success: true, data: preview });
  } catch (err) {
    console.error('Error previewing import:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to preview import'
    });
  }
});

// =====================================================
// POST /api/contacts/import - Execute CSV import
// =====================================================
router.post('/import', async (req, res) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No rows provided for import'
      });
    }

    const contactsToInsert: ContactInsert[] = [];
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const phoneRaw = row.phone || row.normalized_phone || row.raw_phone;
      
      const phoneResult = normalizePhone(phoneRaw);
      if (!phoneResult.isValid || !phoneResult.normalized) {
        errors.push({ row: i + 1, reason: phoneResult.reason || 'Invalid phone' };
        continue;
      }

      contactsToInsert.push({
        business_name: row.business_name || 'Unknown Business',
        contact_name: row.contact_name,
        normalized_phone: phoneResult.normalized,
        raw_phone: phoneRaw,
        category: row.category,
        governorate: row.governorate,
        city: row.city,
        source: row.source || 'csv_import',
        tags: row.tags || [],
        custom_fields: row.custom_fields || {}
      });
    }

    if (contactsToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid contacts to import',
        errors
      });
    }

    // Insert with conflict handling (skip duplicates)
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert(contactsToInsert, { onConflict: 'normalized_phone', ignoreDuplicates: true })
      .select();

    if (error) throw error;

    const result: ImportResult = {
      imported: data?.length || 0,
      skipped: contactsToInsert.length - (data?.length || 0),
      errors
    };

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error importing contacts:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to import contacts'
    });
  }
});

// =====================================================
// PATCH /api/contacts/:id - Update contact
// =====================================================
router.patch('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update contact' 
    });
  }
});

// =====================================================
// POST /api/contacts/:id/opt-out - Mark as opted out
// =====================================================
router.post('/:id/opt-out', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update({ 
        opted_out: true, 
        whatsapp_status: 'opted_out',
        updated_at: new Date().toISOString() 
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'Contact opted out successfully',
      data 
    });
  } catch (err) {
    console.error('Error opting out contact:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to opt out contact' 
    });
  }
});

// =====================================================
// DELETE /api/contacts/:id - Delete contact
// =====================================================
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Contact deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete contact' 
    });
  }
});

export default router;
