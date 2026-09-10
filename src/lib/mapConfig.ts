// src/lib/mapConfig.ts:1 - vector/raster switch to save Stadia credits during prototyping
export const getMapMode = (): 'vector' | 'raster' => {
  if (typeof window === 'undefined') return 'raster' // SSR default = raster (free)
  const saved = localStorage.getItem('agomon_map_mode') as 'vector' | 'raster' | null
  if (saved) return saved
  // env default: raster until puja week
  return (process.env.NEXT_PUBLIC_MAP_MODE as 'vector' | 'raster') ?? 'raster'
}

export const VECTOR_STYLE = `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${process.env.NEXT_PUBLIC_STADIA_KEY || ''}`

export const RASTER_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
}
