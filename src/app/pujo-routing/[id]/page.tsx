import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import PandalMap from "@/components/map/PandalMap";
import SectionBorder from "@/components/ui/SectionBorder";
import RouteDeleteButton from "@/components/pujo-routing/RouteDeleteButton";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://agomon.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from("puja_routes").select("title, description").eq("id", id).single();
    if (!data) return { title: "Route not found | Agomon" };
    return { title: `${data.title} — Pujo Route | Agomon`, description: data.description || "Optimized Pujo route", alternates: { canonical: `${base}/pujo-routing/${id}` } };
  } catch { return { title: "Pujo Route | Agomon" }; }
}

export default async function RouteView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: route } = await supabase.from("puja_routes").select("*").eq("id", id).single();
  if (!route) return <div className="py-20 text-center text-white/50">Route not found or private. <Link href="/pujo-routing" className="text-[#FFD60A] underline">Back</Link></div>;
  if (!route.is_public) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== route.user_id) return <div className="py-20 text-center text-white/50">Private route. <Link href="/pujo-routing" className="text-[#FFD60A] underline">Back</Link></div>;
  }
  // fetch pandal details for map
  let pandals: any[] = [];
  if (route.pandal_ids?.length) {
    const { data } = await supabase.from("pandals").select("id,name,slug,area,latitude,longitude").in("id", route.pandal_ids);
    // reorder by stored ordered_slugs
    const bySlug = new Map((data || []).map((p: any) => [p.slug, p]));
    pandals = (route.ordered_slugs || []).map((s: string) => bySlug.get(s)).filter(Boolean);
  }
  const { data: auth } = await supabase.auth.getUser();
  const isOwner = !!auth.user && auth.user.id === route.user_id;

  return (
    <div className="max-w-3xl mx-auto">
      <SectionBorder />
      <div className="glass-strong rounded-3xl p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/pujo-routing" className="text-xs text-white/40">← All routes</Link>
          {isOwner && <RouteDeleteButton routeId={route.id} ownerId={route.user_id} />}
        </div>
        <h1 className="text-xl font-bold text-white mt-2">{route.title}</h1>
        <p className="text-xs text-white/40 mt-1">by {route.username || "Anonymous"} • {route.distance_m ? `${(route.distance_m / 1000).toFixed(1)} km • ${Math.round(route.duration_s / 60)} min` : ""} • {new Date(route.created_at).toLocaleDateString()} {route.is_public ? '• Public' : '• Private'}</p>
        {route.description && <p className="text-sm text-white/60 mt-2">{route.description}</p>}
        {pandals.length > 0 && <div className="mt-4"><PandalMap pandals={pandals} routeGeoJson={route.geojson} /></div>}
        {pandals.length >= 2 && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${pandals[0].latitude},${pandals[0].longitude}&destination=${pandals[pandals.length - 1].latitude},${pandals[pandals.length - 1].longitude}${pandals.length > 2 ? `&waypoints=${pandals.slice(1, -1).map((p: any) => `${p.latitude},${p.longitude}`).join('|')}` : ''}&travelmode=driving`}
            target="_blank"
            rel="noopener"
            className="mt-3 block w-full text-center bg-[#FFD60A] text-[#020617] rounded-xl py-2.5 text-sm font-semibold"
          >
            Open same route in Google Maps →
          </a>
        )}
        <ol className="mt-3 space-y-1.5">
          {pandals.map((p: any, i: number) => (
            <li key={p.id} className="flex items-center gap-2 text-sm bg-[#020617]/40 border border-[#FFD60A]/10 rounded-xl px-3 py-2">
              <span className="w-7 h-7 rounded-full bg-[#FFD60A] text-[#020617] flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <span className="text-white flex-1">{p.name}</span>
              <Link href={`/pandal/${p.slug}`} className="text-xs text-[#FFD60A]/70 underline">View</Link>
            </li>
          ))}
        </ol>
        <p className="text-[11px] text-white/20 mt-3">Route via OSRM Trip (PUJO-APP by anujeetverma — MIT) blended with Agomon MapLibre.</p>
      </div>
      <SectionBorder className="mt-3 rotate-180" />
    </div>
  );
}
