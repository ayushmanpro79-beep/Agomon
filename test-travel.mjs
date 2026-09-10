import busdata from './data/busdata.json' with {type:'json'};
import {haversineKm} from './src/lib/geo.ts';
const pandals=[{name:'Chetla Agrani Club',slug:'chetla-agrani-club',area:'South Kolkata',latitude:22.517,longitude:88.337},{name:'Ahiritala Sarbojanin',slug:'ahiritala-sarbojanin',area:'North Kolkata',latitude:22.598,longitude:88.363}];
function resolveToStop(raw){
  const key=raw.toLowerCase().trim();
  const stopsSet=new Set(busdata.stops.map(s=>s.name.toLowerCase()));
  if(stopsSet.has(key)) return raw;
  const aliasKey=Object.keys(busdata.aliases).find(k=>k.toLowerCase()===key);
  if(aliasKey){ const v=busdata.aliases[aliasKey]; if(stopsSet.has(v.toLowerCase())) return v; }
  const areaHints={'chetla':'Chetla Park','ahiritola':'Ahiritola','ahiritala':'Ahiritola','sovabazar':'Sovabazar','howrah':'Howrah Station'};
  for(const [k,v] of Object.entries(areaHints)) if(key.includes(k)) return v;
  const pandal=pandals.find(p=>p.name.toLowerCase()===key || p.slug===key.replace(/\s+/g,'-') || p.name.toLowerCase().includes(key) || key.includes(p.name.toLowerCase().split(' ')[0]));
  if(pandal?.latitude){
    let best=null,bd=1e9;
    for(const s of busdata.stops) if(s.lat!=null){
      const d=haversineKm({lat:pandal.latitude,lon:pandal.longitude},{lat:s.lat,lon:s.lng});
      if(d<bd){bd=d;best=s.name}
    }
    if(best) return best;
  }
  return raw;
}
console.log('resolve Chetla', resolveToStop('Chetla Agrani Club'));
console.log('resolve Ahiritala', resolveToStop('Ahiritala Sarbojanin'));
