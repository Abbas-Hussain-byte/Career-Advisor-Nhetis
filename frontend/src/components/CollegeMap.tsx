import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { LatLngBoundsExpression } from 'leaflet';

interface College {
    name: string;
    state?: string;
    type?: string;
    address?: string;
    programs?: string[];
    location?: { coordinates: [number, number] };
}

const CollegeMap = ({ colleges }: { colleges: College[] }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);

    const validColleges = colleges.filter(
        (c) => c.location?.coordinates?.length === 2
    );

    useEffect(() => {
        if (!mapRef.current || validColleges.length === 0) return;

        // Dynamically import leaflet to avoid SSR issues
        import('leaflet').then((L) => {
            // Prevent double init
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            // Fix default marker icons for Vite bundler
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl:
                    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl:
                    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl:
                    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            // Create map centered on India
            const map = L.map(mapRef.current!, {
                center: [20.5937, 78.9629],
                zoom: 5,
                scrollWheelZoom: false,
            });

            mapInstanceRef.current = map;

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(map);

            // Add markers for each college
            const bounds: [number, number][] = [];
            validColleges.forEach((college) => {
                const lat = college.location!.coordinates[1];
                const lng = college.location!.coordinates[0];
                bounds.push([lat, lng]);

                const popupContent = `
                    <div style="min-width:160px;font-family:sans-serif;">
                        <strong style="color:#0A2540;display:block;margin-bottom:4px;font-size:14px;">${college.name}</strong>
                        <span style="color:#666;font-size:12px;">${college.state || ''} · ${college.type || ''}</span>
                        ${college.address ? `<p style="font-size:12px;margin:4px 0 0;color:#555;">📍 ${college.address}</p>` : ''}
                        ${college.programs && college.programs.length > 0
                        ? `<p style="font-size:12px;margin:4px 0 0;color:#555;">${college.programs.slice(0, 3).join(', ')}${college.programs.length > 3 ? '...' : ''}</p>`
                        : ''
                    }
                    </div>
                `;

                L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup(popupContent);
            });

            // Auto-fit bounds to show all markers
            if (bounds.length === 1) {
                map.setView(bounds[0], 12);
            } else if (bounds.length > 1) {
                map.fitBounds(bounds as LatLngBoundsExpression, {
                    padding: [40, 40],
                });
            }
        });

        // Cleanup on unmount
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colleges.length]);

    if (validColleges.length === 0) {
        return (
            <div
                className="rounded-2xl border border-white/20 bg-gray-50 flex items-center justify-center text-gray-400 text-sm"
                style={{ height: '420px' }}
            >
                No college location data available.
            </div>
        );
    }

    return (
        <div
            ref={mapRef}
            className="rounded-2xl overflow-hidden shadow-xl border border-gray-200"
            style={{ height: '420px', width: '100%', zIndex: 1 }}
        />
    );
};

export default CollegeMap;
