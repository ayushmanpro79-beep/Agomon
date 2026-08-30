// src/components/map/Legend.tsx:1 - legends + nearest metro names
export default function Legend({ metros }: { metros?: { name: string }[] }) {
  return (
    <div className="bg-[#020617] border border-[#FFD60A]/10 rounded-xl p-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-[#FFD60A] border-2 border-[#020617] flex items-center justify-center text-[10px]">🪔</span> Pandal (Deepak)</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-[#0B1220] border border-[#FFD60A] flex items-center justify-center text-[10px] font-bold text-[#FFD60A]">M</span> Metro (1km)</span>
        <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-[#3B82F6] inline-block" /> OSRM walking route</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#3B82F6] border-2 border-white inline-block" /> You</span>
      </div>
      {metros && metros.length > 0 && (
        <p className="text-xs text-white/50 mt-2">Nearest metros (1km): <span className="text-[#FFD60A]">{metros.map((m) => m.name).join(', ')}</span></p>
      )}
      {metros && metros.length === 0 && <p className="text-xs text-white/30 mt-2">No metro within 1km</p>}
    </div>
  )
}
