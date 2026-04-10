#!/usr/bin/env node
/**
 * Supabase Migration Script
 * Migrates business records from old project to new project's contacts table
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
// Load environment variables from .env.migration
dotenv.config({ path: resolve(process.cwd(), '.env.migration') });
// Configuration
const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || 'https://hsadukhmcclwixuntqwu.supabase.co';
const OLD_SERVICE_ROLE_KEY = process.env.OLD_SERVICE_ROLE_KEY || '';
const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL || 'https://ujdsxzvvgaugypwtugdl.supabase.co';
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SERVICE_ROLE_KEY || '';
const BATCH_SIZE = 100;
// Validate environment variables
function validateEnv() {
    const missing = [];
    if (!OLD_SERVICE_ROLE_KEY)
        missing.push('OLD_SERVICE_ROLE_KEY');
    if (!NEW_SERVICE_ROLE_KEY)
        missing.push('NEW_SERVICE_ROLE_KEY');
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        console.error('\nPlease add them to .env.migration file');
        process.exit(1);
    }
}
// Phone number normalization
function normalizePhone(phone) {
    if (!phone)
        return { normalized: '', whatsapp: '' };
    let cleaned = phone.trim();
    // Remove spaces, dashes, and other formatting characters
    cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');
    // Normalize based on patterns
    if (cleaned.startsWith('07')) {
        // 07... -> +9647...
        cleaned = '+964' + cleaned.substring(1);
    }
    else if (cleaned.startsWith('7') && cleaned.length >= 10) {
        // 7... -> +9647...
        cleaned = '+964' + cleaned;
    }
    else if (cleaned.startsWith('964')) {
        // 964... -> +964...
        cleaned = '+' + cleaned;
    }
    // Ensure it starts with + for international format
    if (!cleaned.startsWith('+') && cleaned.startsWith('964')) {
        cleaned = '+' + cleaned;
    }
    // WhatsApp phone is normalized phone without the +
    const whatsapp = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
    return {
        normalized: cleaned,
        whatsapp: whatsapp
    };
}
// Fetch businesses from old Supabase
async function fetchBusinesses(oldClient) {
    console.log('📥 Fetching businesses from old project...');
    const { data, error } = await oldClient
        .from('businesses')
        .select('*');
    if (error) {
        console.error('❌ Error fetching businesses:', error.message);
        throw error;
    }
    console.log(`✅ Fetched ${data?.length || 0} businesses`);
    return data || [];
}
// Check UNIQUE constraint on normalized_phone
async function checkUniqueConstraint(newClient) {
    console.log('🔍 Checking UNIQUE constraint on contacts.normalized_phone...');
    try {
        // Try to get table info or perform a test query
        const { data, error } = await newClient
            .from('contacts')
            .select('normalized_phone')
            .limit(1);
        if (error && error.message.includes('does not exist')) {
            console.error('❌ contacts table does not exist in new project');
            return false;
        }
        console.log('✅ contacts table exists');
        return true;
    }
    catch (err) {
        console.error('⚠️ Could not verify UNIQUE constraint:', err);
        return false;
    }
}
// Transform and migrate data in batches
async function migrateInBatches(newClient, businesses) {
    console.log(`\n🚀 Starting migration in batches of ${BATCH_SIZE}...`);
    const results = { success: 0, failed: 0, errors: [] };
    const totalBatches = Math.ceil(businesses.length / BATCH_SIZE);
    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
        const batch = businesses.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
        // Transform batch
        const contacts = batch.map(business => {
            const phoneData = normalizePhone(business.phone);
            return {
                display_name: business.name || 'Unknown',
                raw_phone: business.phone || '',
                normalized_phone: phoneData.normalized,
                whatsapp_phone: phoneData.whatsapp,
                governorate: business.governorate || 'Unknown',
                category: business.category || 'General',
                validity_status: 'valid'
            };
        });
        // Upsert to new database
        try {
            const { data, error } = await newClient
                .from('contacts')
                .upsert(contacts, {
                onConflict: 'normalized_phone',
                ignoreDuplicates: false
            });
            if (error) {
                console.error(`❌ Batch ${batchNum} failed:`, error.message);
                results.failed += batch.length;
                results.errors.push(`Batch ${batchNum}: ${error.message}`);
            }
            else {
                console.log(`✅ Batch ${batchNum} completed (${contacts.length} records)`);
                results.success += contacts.length;
            }
        }
        catch (err) {
            console.error(`❌ Batch ${batchNum} error:`, err.message);
            results.failed += batch.length;
            results.errors.push(`Batch ${batchNum}: ${err.message}`);
        }
        // Small delay between batches to avoid rate limiting
        if (batchNum < totalBatches) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return results;
}
// Verify migration
async function verifyMigration(newClient, expectedCount) {
    console.log('\n🔍 Verifying migration...');
    const { count, error } = await newClient
        .from('contacts')
        .select('*', { count: 'exact', head: true });
    if (error) {
        console.error('❌ Error counting contacts:', error.message);
        return;
    }
    console.log(`📊 contacts table count: ${count}`);
    console.log(`📊 Expected: ${expectedCount}`);
    if (count === expectedCount) {
        console.log('✅ Count matches!');
    }
    else if (count && count < expectedCount) {
        console.log(`⚠️ Some records may have been skipped due to duplicates (${expectedCount - count} fewer)`);
    }
    else {
        console.log('⚠️ Count mismatch - please review');
    }
    // Sample a few records to verify Arabic text
    const { data: sample, error: sampleError } = await newClient
        .from('contacts')
        .select('display_name, governorate, category')
        .limit(5);
    if (sampleError) {
        console.error('❌ Error fetching sample:', sampleError.message);
        return;
    }
    console.log('\n📋 Sample records (checking Arabic preservation):');
    sample?.forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.display_name} | ${record.governorate} | ${record.category}`);
    });
}
// Main migration function
async function runMigration() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   SUPABASE BUSINESS → CONTACTS MIGRATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    // Validate environment
    validateEnv();
    // Create clients
    const oldClient = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    const newClient = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    console.log('🔗 Connected to:');
    console.log(`   Old: ${OLD_SUPABASE_URL}`);
    console.log(`   New: ${NEW_SUPABASE_URL}\n`);
    // Check unique constraint
    const constraintOk = await checkUniqueConstraint(newClient);
    if (!constraintOk) {
        console.warn('⚠️ Please ensure the contacts table exists with UNIQUE constraint on normalized_phone');
    }
    // Fetch all businesses
    const businesses = await fetchBusinesses(oldClient);
    if (businesses.length === 0) {
        console.log('⚠️ No businesses found to migrate');
        return;
    }
    // Show sample of data
    console.log('\n📋 Sample record from old database:');
    const sample = businesses[0];
    console.log(`   Name: ${sample.name}`);
    console.log(`   Phone: ${sample.phone}`);
    console.log(`   Governorate: ${sample.governorate}`);
    console.log(`   Category: ${sample.category || 'N/A'}`);
    // Phone normalization preview
    const phoneData = normalizePhone(sample.phone);
    console.log(`\n📞 Phone normalization preview:`);
    console.log(`   Original: ${sample.phone}`);
    console.log(`   Normalized: ${phoneData.normalized}`);
    console.log(`   WhatsApp: ${phoneData.whatsapp}`);
    // Confirm migration
    console.log(`\n⚡ Ready to migrate ${businesses.length} records`);
    console.log('   (Press Ctrl+C to cancel, continuing in 3 seconds...)\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    // Execute migration
    const results = await migrateInBatches(newClient, businesses);
    // Verify
    await verifyMigration(newClient, results.success);
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Successfully migrated: ${results.success} records`);
    if (results.failed > 0) {
        console.log(`❌ Failed: ${results.failed} records`);
    }
    if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach(err => console.log(`   - ${err}`));
    }
    console.log('═══════════════════════════════════════════════════════════\n');
}
// Run the migration
runMigration().catch(err => {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
});
