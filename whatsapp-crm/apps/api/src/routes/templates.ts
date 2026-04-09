// =====================================================
// Message Templates API Routes
// CRUD + Render operations
// =====================================================

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();

// =====================================================
// Template Engine - Render with variables
// =====================================================
export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined>,
  options: { fallbackMissing?: boolean } = {}
): string {
  let result = template;
  
  // Handle {{variable}} syntax
  const variableRegex = /\{\{(\w+)\}\}/g;
  result = result.replace(variableRegex, (match, varName) => {
    const value = variables[varName];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
    // Fallback: remove gracefully
    return options.fallbackMissing ? '' : match;
  });
  
  // Clean up double spaces left from empty replacements
  result = result.replace(/\s+/g, ' ').trim();
  
  // Clean up awkward punctuation (e.g., "word , word" -> "word, word")
  result = result.replace(/\s+([.,!?:;])/g, '$1');
  
  return result;
}

// =====================================================
// GET /api/templates - List templates
// =====================================================
router.get('/', async (req, res) => {
  try {
    const { type, active } = req.query;

    let query = supabaseAdmin
      .from('message_templates')
      .select('*');

    if (type) query = query.eq('template_type', type);
    if (active !== undefined) query = query.eq('is_active', active === 'true');

    const { data, error } = await query.order('name');

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch templates' 
    });
  }
});

// =====================================================
// GET /api/templates/:id - Get single template
// =====================================================
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found' 
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch template' 
    });
  }
});

// =====================================================
// POST /api/templates - Create template
// =====================================================
router.post('/', async (req, res) => {
  try {
    const { name, body, template_type, variables = [], cta_type = 'reply', variants = [] } = req.body;

    if (!name || !body || !template_type) {
      return res.status(400).json({
        success: false,
        error: 'name, body, and template_type are required'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('message_templates')
      .insert({
        name,
        body,
        template_type,
        variables,
        cta_type,
        variants,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create template' 
    });
  }
});

// =====================================================
// POST /api/templates/:id/preview - Preview rendered message
// =====================================================
router.post('/:id/preview', async (req, res) => {
  try {
    const { variables = {} } = req.body;

    const { data: template, error } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found' 
      });
    }

    // Add sample data for missing variables
    const sampleData: Record<string, string> = {
      business_name: 'محل أبو علي',
      category: 'مطعم',
      city: 'بغداد',
      governorate: 'بغداد',
      claim_link: 'https://malabazen.iq/claim/abc123',
      short_name: 'أبو علي',
      ...variables
    };

    const rendered = renderTemplate(template.body, sampleData, { fallbackMissing: true });

    res.json({
      success: true,
      data: {
        template_id: template.id,
        template_name: template.name,
        original: template.body,
        rendered,
        variables_used: template.variables,
        character_count: rendered.length
      }
    });
  } catch (err) {
    console.error('Error previewing template:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to preview template' 
    });
  }
});

// =====================================================
// POST /api/templates/render - Render any template inline
// =====================================================
router.post('/render', async (req, res) => {
  try {
    const { template, variables = {} } = req.body;

    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'template body is required'
      });
    }

    const rendered = renderTemplate(template, variables, { fallbackMissing: true });

    res.json({
      success: true,
      data: {
        original: template,
        rendered,
        character_count: rendered.length
      }
    });
  } catch (err) {
    console.error('Error rendering template:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to render template' 
    });
  }
});

// =====================================================
// PATCH /api/templates/:id - Update template
// =====================================================
router.patch('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('message_templates')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found' 
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update template' 
    });
  }
});

// =====================================================
// DELETE /api/templates/:id - Delete template
// =====================================================
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('message_templates')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete template' 
    });
  }
});

export default router;
