import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";

// Fix icon pentru bundlere (altfel markerul poate lipsi)
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToSet({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function GeoPicker({
  value,              // geo object sau null
  defaultCenter = [47.651, 25.57], // Bucovina-ish (lat, lng)
  defaultZoom = 10,
  height = 320,
  onChange,           // (geoObj)=>void
}) {
  const position = useMemo(() => {
    const coords = value?.coordinates;
    if (coords?.length === 2) return { lat: coords[1], lng: coords[0] };
    return null;
  }, [value]);

  const center = position ? [position.lat, position.lng] : defaultCenter;

  const pick = (latlng) => {
    onChange?.({
      type: "Point",
      coordinates: [latlng.lng, latlng.lat], // IMPORTANT: [lng, lat]
    });
  };

  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
      <MapContainer center={center} zoom={defaultZoom} style={{ height }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToSet onPick={pick} />
        {position ? (
          <Marker
            position={[position.lat, position.lng]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = e.target.getLatLng();
                pick(p);
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
