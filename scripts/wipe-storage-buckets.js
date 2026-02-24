/**
 * Script to wipe all files from Supabase storage buckets
 * Run with: node scripts/wipe-storage-buckets.js
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function wipeBucket(bucketName) {
  try {
    console.log(`\n📦 Wiping bucket: ${bucketName}`);
    
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error(`❌ Error listing files in ${bucketName}:`, listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log(`✅ Bucket ${bucketName} is already empty`);
      return;
    }

    console.log(`   Found ${files.length} file(s)`);

    const pathsToDelete = [];
    
    async function listRecursive(path = '') {
      const { data: items, error } = await supabase.storage
        .from(bucketName)
        .list(path, {
          limit: 1000,
          offset: 0
        });

      if (error) {
        console.error(`   Error listing ${path}:`, error);
        return;
      }

      if (!items || items.length === 0) return;

      for (const item of items) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        
        if (item.id === null) {
          await listRecursive(fullPath);
        } else {
          pathsToDelete.push(fullPath);
        }
      }
    }

    await listRecursive();

    if (pathsToDelete.length === 0) {
      console.log(`✅ No files to delete in ${bucketName}`);
      return;
    }

    console.log(`   Deleting ${pathsToDelete.length} file(s)...`);

    const batchSize = 100;
    for (let i = 0; i < pathsToDelete.length; i += batchSize) {
      const batch = pathsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(batch);

      if (deleteError) {
        console.error(`   ❌ Error deleting batch ${i / batchSize + 1}:`, deleteError);
      } else {
        console.log(`   ✅ Deleted batch ${i / batchSize + 1} (${batch.length} files)`);
      }
    }

    console.log(`✅ Successfully wiped ${bucketName}`);
  } catch (error) {
    console.error(`❌ Error wiping ${bucketName}:`, error);
  }
}

async function main() {
  console.log('🧹 Starting storage bucket wipe...');
  console.log(`   Supabase URL: ${supabaseUrl}`);

  const buckets = ['company-logos', 'team-photos'];

  for (const bucket of buckets) {
    await wipeBucket(bucket);
  }

  console.log('\n✅ Storage bucket wipe complete!');
}

main().catch(console.error);
