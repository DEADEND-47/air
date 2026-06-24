import { LocateFixed, Minus, Plus } from 'lucide-react';
import type { SensorReading } from '../lib/types';
import { AqiBadge } from './Ui';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { useCity } from '../context/CityContext';

// Fix default icon issue in leaflet under Vite (ESM)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

function MapControls({ selected, readings }: { selected?: SensorReading; readings: SensorReading[] }) {
  const map = useMap();
  const { activeCity } = useCity();

  // Single source of coordinates truth from selected sensor or global active city configuration
  const defaultLat = activeCity?.latitude ?? readings[0]?.latitude ?? 28.6139;
  const defaultLng = activeCity?.longitude ?? readings[0]?.longitude ?? 77.2090;

  useEffect(() => {
    const lat = selected?.latitude ?? defaultLat;
    const lng = selected?.longitude ?? defaultLng;
    const zoom = selected ? 12 : 11;
    
    // Smooth flying animation to target coordinates
    map.flyTo([lat, lng], zoom, {
      animate: true,
      duration: 1.5,
    });
  }, [selected, defaultLat, defaultLng, map]);

  return (
    <div className="leaflet-top leaflet-right custom-map-controls" style={{ zIndex: 1000, position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <button aria-label="Zoom in" className="button secondary" style={{ padding: '8px', minWidth: 'auto' }} onClick={() => map.zoomIn()}><Plus size={16} /></button>
      <button aria-label="Zoom out" className="button secondary" style={{ padding: '8px', minWidth: 'auto' }} onClick={() => map.zoomOut()}><Minus size={16} /></button>
      <button aria-label="Center map" className="button secondary" style={{ padding: '8px', minWidth: 'auto' }} onClick={() => map.flyTo([defaultLat, defaultLng], 11, { animate: true, duration: 1.5 })}><LocateFixed size={16} /></button>
    </div>
  );
}

export function MapPanel({ readings, selected, onSelect, className = '' }: { readings: SensorReading[]; selected?: SensorReading; onSelect?: (reading: SensorReading) => void; className?: string }) {
  const { activeCity } = useCity();

  const firstLat = activeCity?.latitude ?? readings[0]?.latitude ?? 28.6139;
  const firstLng = activeCity?.longitude ?? readings[0]?.longitude ?? 77.2090;
  const position: [number, number] = [firstLat, firstLng];

  return (
    <section className={`map-panel ${className}`} aria-label={`${activeCity?.name ?? 'City'} air quality monitoring map`} style={{ position: 'relative', overflow: 'hidden' }}>
      <MapContainer center={position} zoom={11} style={{ height: '100%', width: '100%', minHeight: '350px' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {readings.map((reading) => {
          const isSelected = selected?.id === reading.id;
          const aqiClass = reading.aqi > 300 ? 'danger' : reading.aqi > 180 ? 'warning' : 'good';
          const iconHtml = `
            <div class="sensor-node aqi-node-${aqiClass} ${isSelected ? 'selected' : ''}" style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 11px;">
              <span>${reading.aqi}</span>
            </div>`;
          const icon = L.divIcon({ html: iconHtml, className: '' , iconSize: [30, 30]});
          return (
            <Marker
              key={reading.id}
              position={[reading.latitude, reading.longitude]}
              icon={icon}
              eventHandlers={{ click: () => onSelect?.(reading) }}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <strong>{reading.ward}</strong><br/>
                  <span style={{ fontSize: '12px', color: '#666' }}>Node {reading.sensorId}</span>
                  <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                     <AqiBadge value={reading.aqi} />
                  </div>
                  <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', margin: 0, fontSize: '11px' }}>
                    <dt style={{ fontWeight: 'normal', color: '#666' }}>PM2.5</dt><dd style={{ margin: 0, fontWeight: 'bold', textAlign: 'right' }}>{reading.pm25}</dd>
                    <dt style={{ fontWeight: 'normal', color: '#666' }}>PM10</dt><dd style={{ margin: 0, fontWeight: 'bold', textAlign: 'right' }}>{reading.pm10}</dd>
                    <dt style={{ fontWeight: 'normal', color: '#666' }}>NO₂</dt><dd style={{ margin: 0, fontWeight: 'bold', textAlign: 'right' }}>{reading.no2}</dd>
                  </dl>
                </div>
              </Popup>
            </Marker>
          );
        })}
        <MapControls selected={selected} readings={readings} />
      </MapContainer>
      <div className="map-legend">
        <span><i className="legend-good" />GOOD</span>
        <span><i className="legend-warning" />POOR</span>
        <span><i className="legend-danger" />SEVERE</span>
      </div>
      <div className="map-coordinates">
        {firstLat.toFixed(4)}° N / {firstLng.toFixed(4)}° E <span>GRID 1KM</span>
      </div>
    </section>
  );
}
