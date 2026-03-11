import type { LatLngBoundsExpression, LatLngExpression, LatLngLiteral } from "leaflet";
import {
  Icon as LeafletIcon,
  type IconOptions as LeafletIconOptions,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import * as React from "react";
import {
  LayersControl,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";

const DACH_CENTER: LatLngLiteral = { lat: 47.45, lng: 10.55 };
const DACH_BOUNDS: LatLngBoundsExpression = [
  [45.7, 5.6],
  [55.1, 17.3],
];
const DETAIL_ZOOM = 15;

const markerIcon = new LeafletIcon({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
} satisfies LeafletIconOptions);

export interface ShopLocationMapProps {
  latitude?: string | number | null;
  longitude?: string | number | null;
  className?: string;
  standardLayerLabel?: string;
  satelliteLayerLabel?: string;
}

function parseCoordinate(value: string | number | null | undefined, min: number, max: number) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= min && value <= max ? value : null;
  }

  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function ViewportSync({ position }: { position: LatLngLiteral | null }) {
  const map = useMap();

  React.useEffect(() => {
    if (position) {
      map.setView(position, DETAIL_ZOOM, { animate: false });
      return;
    }

    map.fitBounds(DACH_BOUNDS, {
      animate: false,
      padding: [20, 20],
    });
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

export function ShopLocationMap({
  latitude,
  longitude,
  className = "",
  standardLayerLabel = "Standard",
  satelliteLayerLabel = "Satellit",
}: ShopLocationMapProps) {
  const shopPosition = React.useMemo<LatLngLiteral | null>(() => {
    const lat = parseCoordinate(latitude, -90, 90);
    const lng = parseCoordinate(longitude, -180, 180);
    if (lat === null || lng === null) return null;
    return { lat, lng };
  }, [latitude, longitude]);
  const [browserPosition, setBrowserPosition] = React.useState<LatLngLiteral | null>(null);

  React.useEffect(() => {
    if (shopPosition) {
      setBrowserPosition(null);
      return;
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

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
    <div
      className={`overflow-hidden rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] ${className}`}
    >
      <MapContainer
        center={DACH_CENTER as LatLngExpression}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name={standardLayerLabel}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name={satelliteLayerLabel}>
            <TileLayer
              attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <ResizeSync />
        <ViewportSync position={markerPosition} />
        {markerPosition ? <Marker position={markerPosition} icon={markerIcon} /> : null}
      </MapContainer>
    </div>
  );
}
