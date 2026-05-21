"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import { Check, ExternalLink, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type LocationResult = {
  lat: number;
  lng: number;
  name: string;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const ASUNCION: [number, number] = [-25.2867, -57.647];
const DEFAULT_ZOOM = 13;

// Red pin matching app brand color
const PIN_HTML = `<div style="
  width:22px;height:22px;
  background:#8f2f2b;
  border-radius:50% 50% 50% 0;
  transform:rotate(-45deg);
  border:3px solid #fff;
  box-shadow:0 2px 8px rgba(0,0,0,0.35);
"></div>`;

type Props = {
  initial?: string;
  onConfirm: (result: LocationResult) => void;
  onClose: () => void;
};

export default function LocationPicker({ initial, onConfirm, onClose }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const iconRef = useRef<ReturnType<typeof import("leaflet")["divIcon"]> | null>(null);

  const [query, setQuery] = useState(initial ?? "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Prevent browser-level zoom while this modal is open
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    document.addEventListener("wheel", preventZoom, { passive: false });
    return () => document.removeEventListener("wheel", preventZoom);
  }, []);

  // Init Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    async function init() {
      const L = await import("leaflet");
      leafletRef.current = L;
      if (cancelled || !mapContainerRef.current) return;

      const icon = L.divIcon({
        html: PIN_HTML,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
        className: "",
      });
      iconRef.current = icon;

      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(
        ASUNCION,
        DEFAULT_ZOOM,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      map.on("click", async (e) => {
        if (cancelled) return;
        const { lat, lng } = e.latlng;
        placeMarker(lat, lng);
        const name = await reverseGeocode(lat, lng);
        if (!cancelled) {
          setSelected({ lat, lng, name });
          setQuery(name);
        }
      });
    }

    init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(lat: number, lng: number) {
    const map = mapRef.current;
    const L = leafletRef.current;
    const icon = iconRef.current;
    if (!map || !L || !icon) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", async () => {
        const pos = markerRef.current!.getLatLng();
        const name = await reverseGeocode(pos.lat, pos.lng);
        setSelected({ lat: pos.lat, lng: pos.lng, name });
        setQuery(name);
      });
    }
  }

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "es", "User-Agent": "carnesapp/1.0" } },
      );
      const data = (await res.json()) as { display_name?: string };
      return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6`,
        { headers: { "Accept-Language": "es", "User-Agent": "carnesapp/1.0" } },
      );
      const data = (await res.json()) as NominatimResult[];
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r: NominatimResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setResults([]);
    setSelected({ lat, lng, name: r.display_name });
    setQuery(r.display_name);
    const map = mapRef.current;
    if (map) {
      map.setView([lat, lng], 16);
      placeMarker(lat, lng);
    }
  }

  const mapsUrl = selected
    ? `https://maps.google.com/?q=${selected.lat},${selected.lng}`
    : null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white" style={{ touchAction: "pan-x pan-y" }}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-zinc-100" aria-label="Cerrar">
          <X className="h-5 w-5 text-zinc-600" />
        </button>
        <span className="font-semibold text-zinc-900">Ubicación del evento</span>
      </div>

      {/* Search bar */}
      <div className="relative shrink-0 px-4 py-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setResults([]); }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar dirección o lugar…"
            className="flex-1 rounded-[6px] border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#8f2f2b]"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#8f2f2b] px-3 py-2 text-sm font-medium text-white hover:bg-[#7d2926] disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {searching ? "…" : "Buscar"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="absolute left-4 right-4 top-full z-10 mt-0.5 overflow-hidden rounded-[6px] border border-zinc-200 bg-white shadow-xl">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => pickResult(r)}
                className="flex w-full items-start gap-2 border-b border-zinc-100 px-3 py-2.5 text-left last:border-0 hover:bg-zinc-50"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8f2f2b]" />
                <span className="line-clamp-2 text-sm text-zinc-700">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1" />

      {/* Footer */}
      <div className="shrink-0 border-t border-zinc-200 px-4 py-3">
        {selected ? (
          <div className="mb-2 rounded-[6px] border border-zinc-100 bg-zinc-50 px-3 py-2">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8f2f2b]" />
              <span className="line-clamp-2 flex-1 text-xs text-zinc-600">{selected.name}</span>
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#8f2f2b] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {mapsUrl}
              </a>
            )}
          </div>
        ) : (
          <p className="mb-2 text-xs text-zinc-400">
            Tocá el mapa o buscá un lugar para marcar la ubicación
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-[6px] border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="flex flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#8f2f2b] py-2.5 text-sm font-medium text-white hover:bg-[#7d2926] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Confirmar ubicación
          </button>
        </div>
      </div>
    </div>
  );
}
