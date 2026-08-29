// scripts/geocode-pandals.mjs:1 - fill lat/lng for 45 pandals via OSM Nominatim -> Supabase
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('C:/Users/AYUSHMAN/OneDrive/Documents/Agomon/agomon/.env.local','utf8')
  .split('\n').reduce((a,l)=>{const [k,...r]=l.split('='); if(k&&r.length) a[k.trim()]=r.join('=').trim(); return a;},{});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
// need service role for updates - try anon first, if RLS blocks we will warn
// For updates we need policy: create policy "Allow public update" on pandals for update using (true) with check (true);

async function geocode(name){
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ', Kolkata, India')}&format=json&limit=1`;
  const res = await fetch(url, {headers:{'User-Agent':'Agomon/1.0','Accept-Language':'en'}});
  const data = await res.json();
  await new Promise(r=>setTimeout(r, 1100)); // Nominatim 1 req/sec policy
  if(!data[0]) return null;
  return {lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name};
}

const {data:pandals} = await supabase.from('pandals').select('id, name, slug, latitude');
console.log(`Found ${pandals.length} pandals, geocoding...`);
let updated=0;
for(const p of pandals){
  if(p.latitude) { console.log(`skip ${p.slug} already has ${p.latitude}`); continue; }
  console.log(`geocode ${p.name}...`);
  const g = await geocode(p.name);
  if(!g){ console.log(`  no result for ${p.name}`); continue; }
  console.log(`  -> ${g.lat}, ${g.lon} | ${g.display_name.slice(0,60)}`);
  const {error} = await supabase.from('pandals').update({latitude:g.lat, longitude:g.lon, address:g.display_name}).eq('id', p.id);
  if(error) console.log(`  update error: ${error.message} (need RLS update policy)`);
  else { updated++; console.log(`  updated`); }
}
console.log(`Done: ${updated} updated`);

// Add RLS update policy hint if needed
if(updated===0){
  console.log(`\nIf updates failed with RLS, run in Supabase SQL Editor:`);
  console.log(`create policy "Allow public update" on pandals for update using (true) with check (true);`);
  console.log(`grant update on pandals to anon, authenticated;`);
}
