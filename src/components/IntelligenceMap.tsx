'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TestPoint {
  id: string;
  drug: string;
  group: string;
  confidence: string;
  lat: number;
  lng: number;
  district: string;
  state: string;
  date: string;
}

interface IntelligenceMapProps {
  tests: TestPoint[];
  drugColors: Record<string, string>;
}

export default function IntelligenceMap({ tests, drugColors }: IntelligenceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([22.5937, 78.9629], 5);
    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    // Add markers
    tests.forEach(test => {
      const color = drugColors[test.group] || '#666';
      const radius = test.confidence === 'confirmed' ? 10 : test.confidence === 'probable' ? 8 : 6;

      const marker = L.circleMarker([test.lat, test.lng], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.7,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 200px;">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">${test.drug}</div>
          <div style="font-size: 12px; color: #666;">
            <strong>Group:</strong> ${test.group}<br>
            <strong>Confidence:</strong> <span style="color: ${color};">${test.confidence}</span><br>
            <strong>Location:</strong> ${test.district}, ${test.state}<br>
            <strong>Date:</strong> ${test.date}
          </div>
        </div>
      `);
    });
  }, [tests, drugColors]);

  return (
    <div 
      ref={mapRef}
      className="map-container"
      style={{ height: '500px', width: '100%' }}
    />
  );
}
