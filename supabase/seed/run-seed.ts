/**
 * One-time local script: upserts INGREDIENTS_SEED into the `ingredients`
 * table using the Supabase service-role key (bypasses RLS). Never run this
 * in the browser or ship the service-role key to the client.
 *
 * Usage:
 *   1. Apply supabase/schema.sql in the Supabase SQL editor first.
 *   2. Put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a local .env
 *      (see .env.example — SUPABASE_SERVICE_ROLE_KEY, and reuse
 *      VITE_SUPABASE_URL for the URL).
 *   3. Run: npx tsx supabase/seed/run-seed.ts
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { INGREDIENTS_SEED } from './ingredients-seed'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your local .env file.',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  const rows = INGREDIENTS_SEED.map((entry) => ({
    canonical_name: entry.canonical_name,
    inci_name: entry.inci_name ?? null,
    aliases: entry.aliases,
    category: entry.category,
    comedogenic_rating: entry.comedogenic_rating,
    irritancy_rating: entry.irritancy_rating,
    benefit_score: entry.benefit_score,
    skin_type_fit: entry.skin_type_fit,
    description: entry.description,
    is_rated: true,
    source: 'seed',
  }))

  const { error, count } = await supabase
    .from('ingredients')
    .upsert(rows, { onConflict: 'canonical_name', count: 'exact' })

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`Seeded/updated ${count ?? rows.length} ingredients.`)
}

main()
