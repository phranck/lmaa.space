import type { LatLngBoundsExpression, LatLngExpression, LatLngLiteral } from "leaflet";
import { Control, DomEvent, DomUtil, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import * as React from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

const DACH_CENTER: LatLngLiteral = { lat: 47.45, lng: 10.55 };
const DACH_BOUNDS: LatLngBoundsExpression = [
  [45.7, 5.6],
  [55.1, 17.3],
];
const DETAIL_ZOOM = 15;
const STORAGE_KEY = "lmaa-map-prefs";

const MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#d97706"/><circle cx="12.5" cy="12.5" r="6" fill="#fff"/></svg>`;

const markerIcon = new DivIcon({
  html: MARKER_SVG,
  className: "",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const LAYERS = [
  {
    id: "osm",
    label: "Karte",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    thumb: "https://a.tile.openstreetmap.org/12/2135/1407.png",
  },
  {
    id: "satellite",
    label: "Satellit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 19,
    thumb: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1407/2135",
  },
  {
    id: "topo",
    label: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
    thumb: "https://a.tile.opentopomap.org/12/2135/1407.png",
  },
  {
    id: "hot",
    label: "HOT",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://hot.openstreetmap.org/">HOT</a>',
    maxZoom: 19,
    thumb: "https://a.tile.openstreetmap.fr/hot/12/2135/1407.png",
  },
] as const;

type MapPrefs = {
  zoom: number;
  layer: string;
};

// ---------------------------------------------------------------------------
// Scoped CSS
// ---------------------------------------------------------------------------

const SCOPED_CSS = /* css */ `
.slm-root .leaflet-bar {
  border: none !important;
  border-radius: 10px !important;
  overflow: hidden !important;
  box-shadow: none !important;
}
.slm-root .leaflet-bar a,
.slm-root .leaflet-bar a:hover {
  background-color: rgba(0, 0, 0, 0.4) !important;
  color: #fff !important;
  border: none !important;
}
.slm-root .leaflet-bar a:hover {
  background-color: rgba(0, 0, 0, 0.6) !important;
}
.slm-root .leaflet-control-attribution {
  background-color: rgba(0, 0, 0, 0.35) !important;
  color: rgba(255, 255, 255, 0.8) !important;
}
.slm-root .leaflet-control-attribution a {
  color: rgba(255, 255, 255, 0.9) !important;
}
.slm-root .leaflet-container {
  z-index: 0;
}
.slm-switcher {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.slm-toggle {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background-color: rgba(0, 0, 0, 0.4);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background-color 0.15s;
  flex-shrink: 0;
}
.slm-toggle:hover {
  background-color: rgba(0, 0, 0, 0.6);
}
.slm-panel {
  display: flex;
  gap: 6px;
  overflow: hidden;
  max-width: 0;
  opacity: 0;
  transition: max-width 0.3s ease, opacity 0.25s ease;
}
.slm-panel-open {
  max-width: 280px;
  opacity: 1;
}
.slm-layer-btn {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  border: 2px solid transparent;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: border-color 0.15s, transform 0.15s;
  flex-shrink: 0;
  padding: 0;
  background: none;
}
.slm-layer-btn:hover {
  transform: scale(1.05);
}
.slm-layer-btn-active {
  border-color: #fff;
}
.slm-layer-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.slm-layer-btn span {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 9px;
  font-weight: 600;
  text-align: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  padding: 2px 0;
  line-height: 1.2;
}
`;

function LayersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" style={{ marginTop: -3 }}>
      <path d="M230.91 124 128 180.07 25.09 124a8 8 0 0 0-10.18 12l104 56a8 8 0 0 0 7.58 0l104-56a8 8 0 0 0-10.18-12ZM128 236.07 25.09 180a8 8 0 1 0-7.58 14.12l104 56a8 8 0 0 0 7.58 0l104-56a8 8 0 0 0-7.58-14.12Zm-99.49-128 104-56a8 8 0 0 1 7.58 0l104 56a8 8 0 0 1 0 14.12l-104 56a8 8 0 0 1-7.58 0l-104-56a8 8 0 0 1 0-14.12Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShopLocationMapProps {
  latitude?: string | number | null;
  longitude?: string | number | null;
  name?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCoordinate(
  value: string | number | null | undefined,
  min: number,
  max: number,
) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= min && value <= max
      ? value
      : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function getDefaultPrefs(): MapPrefs {
  return { zoom: DETAIL_ZOOM, layer: "osm" };
}

function loadPrefs(): MapPrefs {
  try {
    if (typeof window === "undefined") return getDefaultPrefs();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPrefs();
    const prefs = JSON.parse(raw);
    const fallback = getDefaultPrefs();
    return {
      zoom: typeof prefs.zoom === "number" ? prefs.zoom : fallback.zoom,
      layer: typeof prefs.layer === "string" ? prefs.layer : fallback.layer,
    };
  } catch {
    return getDefaultPrefs();
  }
}

function savePrefs(nextPrefs: Partial<MapPrefs>) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...loadPrefs(), ...nextPrefs }),
    );
  } catch {}
}

// ---------------------------------------------------------------------------
// Internal map components
// ---------------------------------------------------------------------------

function ViewportSync({
  position,
}: {
  position: LatLngLiteral | null;
}) {
  const map = useMap();
  const hadPositionRef = React.useRef(position !== null);

  React.useEffect(() => {
    const hadPosition = hadPositionRef.current;
    hadPositionRef.current = position !== null;

    if (position) {
      const zoom = hadPosition ? map.getZoom() : loadPrefs().zoom;
      map.setView(position, zoom, { animate: false });
    } else {
      map.fitBounds(DACH_BOUNDS, { animate: false, padding: [20, 20] });
    }
  }, [map, position]);

  return null;
}

function ResizeSync() {
  const map = useMap();

  React.useEffect(() => {
    const container = map.getContainer();
    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false, animate: false });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

function FullscreenControl() {
  const map = useMap();

  React.useEffect(() => {
    const FullscreenCtrl = Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const container = DomUtil.create(
          "div",
          "leaflet-bar leaflet-control",
        );
        const a = DomUtil.create("a", "", container);
        a.href = "#";
        a.title = "Vollbild";
        a.setAttribute("role", "button");
        a.setAttribute("aria-label", "Vollbild");
        a.innerHTML = "\u26F6";
        a.style.cssText =
          "display:flex;align-items:center;justify-content:center;width:30px;height:30px;font-size:18px;line-height:1;text-decoration:none;color:#fff";
        DomEvent.disableClickPropagation(container);
        DomEvent.on(a, "click", (e) => {
          DomEvent.preventDefault(e);
          const root = map.getContainer().closest(".slm-root");
          if (!root) return;
          if (!document.fullscreenElement) {
            root.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        });
        return container;
      },
    });

    const control = new FullscreenCtrl({});
    control.addTo(map);

    const root = map.getContainer().closest(".slm-root");
    function onFullscreenChange() {
      setTimeout(() => map.invalidateSize(), 100);
    }
    root?.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      control.remove();
      root?.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [map]);

  return null;
}

function PreferencePersist({
  layerId,
  persistZoom,
}: {
  layerId: string;
  persistZoom: boolean;
}) {
  const map = useMap();
  const persistZoomRef = React.useRef(persistZoom);
  persistZoomRef.current = persistZoom;

  React.useEffect(() => {
    function onZoomEnd() {
      if (persistZoomRef.current) {
        savePrefs({ zoom: map.getZoom() });
      }
    }
    map.on("zoomend", onZoomEnd);
    return () => {
      map.off("zoomend", onZoomEnd);
    };
  }, [map]);

  React.useEffect(() => {
    savePrefs({ layer: layerId });
  }, [layerId]);

  return null;
}

// ---------------------------------------------------------------------------
// Layer switcher
// ---------------------------------------------------------------------------

function LayerSwitcher({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  function startAutoClose() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 5000);
  }

  function handleToggle() {
    setOpen((prev) => {
      clearTimeout(timerRef.current);
      if (!prev) startAutoClose();
      return !prev;
    });
  }

  function handleSelect(id: string) {
    startAutoClose();
    if (id !== activeId) onSelect(id);
  }

  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      role="presentation"
      className="slm-switcher"
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className={`slm-panel ${open ? "slm-panel-open" : ""}`}>
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={`slm-layer-btn ${layer.id === activeId ? "slm-layer-btn-active" : ""}`}
            title={layer.label}
            onClick={() => handleSelect(layer.id)}
          >
            <img src={layer.thumb} alt={layer.label} />
            <span>{layer.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="slm-toggle"
        title="Kartenstil"
        aria-label="Kartenstil wechseln"
        onClick={handleToggle}
      >
        <LayersIcon />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ShopLocationMap({
  latitude,
  longitude,
  name,
  className = "",
}: ShopLocationMapProps) {
  const shopPosition = React.useMemo<LatLngLiteral | null>(() => {
    const lat = parseCoordinate(latitude, -90, 90);
    const lng = parseCoordinate(longitude, -180, 180);
    if (lat === null || lng === null) return null;
    return { lat, lng };
  }, [latitude, longitude]);

  const [browserPosition, setBrowserPosition] =
    React.useState<LatLngLiteral | null>(null);
  const [prefs] = React.useState(loadPrefs);
  const [activeLayerId, setActiveLayerId] = React.useState(prefs.layer);

  const activeLayer = LAYERS.find((l) => l.id === activeLayerId) ?? LAYERS[0];

  React.useEffect(() => {
    if (shopPosition) {
      setBrowserPosition(null);
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator))
      return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setBrowserPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        if (cancelled) return;
        setBrowserPosition(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 10 * 60 * 1000,
      },
    );

    return () => {
      cancelled = true;
    };
  }, [shopPosition]);

  const markerPosition = shopPosition ?? browserPosition;

  return (
    <div role="application" aria-label={name ? `Karte: ${name}` : "Karte"} className={`slm-root relative overflow-hidden ${className}`}>
      {/* Scoped CSS for Leaflet map styling -- static trusted content */}
      <style>{SCOPED_CSS}</style>
      <MapContainer
        center={(shopPosition ?? DACH_CENTER) as LatLngExpression}
        zoom={shopPosition ? prefs.zoom : 6}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          key={activeLayer.id}
          attribution={activeLayer.attribution}
          url={activeLayer.url}
          maxZoom={activeLayer.maxZoom}
        />
        <ResizeSync />
        <ViewportSync position={markerPosition} />
        <FullscreenControl />
        <PreferencePersist layerId={activeLayerId} persistZoom={markerPosition !== null} />
        {markerPosition && (
          <Marker position={markerPosition} icon={markerIcon}>
            {name && <Popup>{name}</Popup>}
          </Marker>
        )}
      </MapContainer>
      <LayerSwitcher activeId={activeLayerId} onSelect={setActiveLayerId} />
    </div>
  );
}
