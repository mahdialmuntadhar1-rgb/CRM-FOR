import { createClient } from '@supabase/supabase-js';
// =============================================================================
// CREDENTIALS
// =============================================================================
const SOURCE_URL = 'https://hsadukhmcclwixuntqwu.supabase.co';
const SOURCE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzYWR1a2htY2Nsd2l4dW50cXd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA4MzM2OCwiZXhwIjoyMDg4NjU5MzY4fQ.2YpuPKrlv4jQNG-5dDlnzWzFqjqRbO_bxXksWh4PRZY';
const TARGET_URL = 'https://ujdsxzvvgaugypwtugdl.supabase.co';
const TARGET_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZHN4enZ2Z2F1Z3lwd3R1Z2RsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM3NDc2NiwiZXhwIjoyMDkwOTUwNzY2fQ.-t2egD15jUCt77X4IXG_ROksAj8xh4IDqt6A8l1lE_c';
// =============================================================================
// CLIENTS
// =============================================================================
const sourceClient = createClient(SOURCE_URL, SOURCE_KEY);
const targetClient = createClient(TARGET_URL, TARGET_KEY);
// =============================================================================
// PHONE NORMALIZATION
// =============================================================================
function normalizePhone(phone) {
    if (!phone)
        return null;
    let normalized = phone.trim();
    // Remove any existing + to avoid double ++
    normalized = normalized.replace(/^\+/, '');
    // Handle 07... or 7... → +9647...
    if (normalized.startsWith('07')) {
        normalized = '+964' + normalized.substring(1);
    }
    else if (normalized.startsWith('7')) {
        normalized = '+964' + normalized;
    }
    else if (!normalized.startsWith('964')) {
        // If it doesn't start with 964, assume it's a local number
        normalized = '+964' + normalized;
    }
    else {
        // Already has 964 prefix
        normalized = '+' + normalized;
    }
    return normalized;
}
function getWhatsAppPhone(normalizedPhone) {
    if (!normalizedPhone)
        return null;
    return normalizedPhone.replace(/^\+/, '');
}
// =============================================================================
// DATABASE CONSTRAINT CHECK
// =============================================================================
async function ensureUniqueConstraint() {
    console.log('🔍 Checking UNIQUE constraint on normalized_phone...');
    try {
        // Check if constraint exists
        const { data: constraints, error } = await targetClient
            .from('information_schema.table_constraints')
            .select('constraint_name, constraint_type')
            .eq('table_name', 'contacts')
            .eq('constraint_type', 'UNIQUE');
        if (error) {
            console.log('⚠️ Could not check constraints via information_schema, attempting direct SQL...');
        }
        // Try to add the constraint directly (will fail silently if it exists)
        const { error: alterError } = await targetClient.rpc('exec_sql', {
            sql: `ALTER TABLE contacts ADD CONSTRAINT IF NOT EXISTS unique_normalized_phone UNIQUE (normalized_phone);`
        });
        if (alterError && !alterError.message.includes('already exists')) {
            console.log('⚠️ Note: Could not add constraint via RPC. You may need to run this SQL manually:');
            console.log('   ALTER TABLE contacts ADD CONSTRAINT unique_normalized_phone UNIQUE (normalized_phone);');
        }
        else {
            console.log('✅ UNIQUE constraint confirmed on normalized_phone');
        }
    }
    catch (err) {
        console.log('⚠️ Constraint check skipped (expected if no exec_sql function exists)');
    }
}
async function fetchSourceData() {
    console.log('📥 Fetching data from SOURCE database (with pagination)...');
    const allData = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    while (hasMore) {
        const { data, error } = await sourceClient
            .from('businesses')
            .select('*')
            .range(offset, offset + limit - 1);
        if (error) {
            throw new Error(`Failed to fetch from source: ${error.message}`);
        }
        if (data && data.length > 0) {
            allData.push(...data);
            console.log(`  Fetched ${data.length} records (total so far: ${allData.length})`);
            if (data.length < limit) {
                hasMore = false;
            }
            else {
                offset += limit;
            }
        }
        else {
            hasMore = false;
        }
    }
    console.log(`✅ Fetched ${allData.length} total records from businesses table`);
    return allData;
}
function transformData(businesses) {
    console.log('🔄 Transforming and deduplicating data...');
    const seen = new Set();
    const duplicates = [];
    const transformed = businesses.map(business => {
        const normalizedPhone = normalizePhone(business.phone);
        return {
            display_name: business.name,
            raw_phone: business.phone,
            normalized_phone: normalizedPhone,
            whatsapp_phone: getWhatsAppPhone(normalizedPhone),
            governorate: business.governorate,
            category: business.category,
            validity_status: 'valid'
        };
    }).filter(contact => {
        if (!contact.normalized_phone)
            return false; // Skip null phones
        if (seen.has(contact.normalized_phone)) {
            duplicates.push(contact.normalized_phone);
            return false;
        }
        seen.add(contact.normalized_phone);
        return true;
    });
    if (duplicates.length > 0) {
        console.log(`⚠️ Removed ${duplicates.length} duplicate phone numbers`);
    }
    console.log(`📝 Transformed ${transformed.length} unique records`);
    return transformed;
}
async function upsertBatch(contacts, batchNumber, totalBatches) {
    console.log(`📤 Upserting batch ${batchNumber}/${totalBatches} (${contacts.length} records)...`);
    const { data, error } = await targetClient
        .from('contacts')
        .upsert(contacts, {
        onConflict: 'normalized_phone',
        ignoreDuplicates: false
    });
    if (error) {
        console.error(`❌ Batch ${batchNumber} failed:`, error.message);
        return 0;
    }
    console.log(`✅ Batch ${batchNumber} complete`);
    return contacts.length;
}
async function migrateData() {
    const BATCH_SIZE = 100;
    // Step 1: Fetch source data
    const sourceData = await fetchSourceData();
    if (sourceData.length === 0) {
        console.log('⚠️ No data to migrate');
        return;
    }
    // Step 2: Transform
    const transformedData = transformData(sourceData);
    console.log(`📝 Transformed ${transformedData.length} records`);
    // Step 3: Calculate batches
    const totalBatches = Math.ceil(transformedData.length / BATCH_SIZE);
    console.log(`🔢 Processing in ${totalBatches} batches of ${BATCH_SIZE}`);
    // Step 4: Process batches
    let totalUpserted = 0;
    for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, transformedData.length);
        const batch = transformedData.slice(start, end);
        const upserted = await upsertBatch(batch, i + 1, totalBatches);
        totalUpserted += upserted;
        // Small delay to avoid rate limiting
        if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    console.log(`\n🎉 Migration complete! Total records processed: ${totalUpserted}`);
}
// =============================================================================
// VERIFICATION
// =============================================================================
async function verifyMigration() {
    console.log('\n🔍 Verifying migration...');
    // Check total count
    const { count, error: countError } = await targetClient
        .from('contacts')
        .select('*', { count: 'exact', head: true });
    if (countError) {
        console.error('❌ Failed to get count:', countError.message);
    }
    else {
        console.log(`📊 Total records in contacts table: ${count}`);
    }
    // Sample records with Arabic text
    const { data: samples, error: sampleError } = await targetClient
        .from('contacts')
        .select('display_name, governorate, normalized_phone')
        .limit(5);
    if (sampleError) {
        console.error('❌ Failed to fetch samples:', sampleError.message);
    }
    else {
        console.log('\n📋 Sample records (checking Arabic characters):');
        samples?.forEach((record, i) => {
            console.log(`   ${i + 1}. ${record.display_name || 'N/A'} | ${record.governorate || 'N/A'} | ${record.normalized_phone || 'N/A'}`);
        });
    }
}
// =============================================================================
// MAIN
// =============================================================================
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('    SUPABASE DATA MIGRATION: SOURCE → TARGET');
    console.log('═══════════════════════════════════════════════════════════\n');
    try {
        // Step 1: Ensure constraint
        await ensureUniqueConstraint();
        // Step 2: Migrate data
        await migrateData();
        // Step 3: Verify
        await verifyMigration();
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('    ✅ MIGRATION COMPLETE');
        console.log('═══════════════════════════════════════════════════════════');
    }
    catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}
main();
