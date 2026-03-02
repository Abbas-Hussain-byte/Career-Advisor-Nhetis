import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet marker icon (Vite bundler issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CollegeMap = ({ colleges }: { colleges: any[] }) => {
    const validColleges = colleges.filter(
        c => c.location?.coordinates?.length === 2
    );

    const center: [number, number] =
        validColleges.length > 0
            ? [validColleges[0].location.coordinates[1], validColleges[0].location.coordinates[0]]
            : [20.5937, 78.9629]; // India center

    return (
        <div className="rounded-2xl overflow-hidden shadow-xl border border-white/20" style={{ height: '400px' }}>
            <MapContainer
                center={center}
                zoom={validColleges.length === 1 ? 12 : 5}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {validColleges.map((college, idx) => (
                    <Marker
                        key={idx}
                        position={[college.location.coordinates[1], college.location.coordinates[0]]}
                    >
                        <Popup>
                            <div className="text-sm min-w-[140px]">
                                <strong className="text-[#0A2540] block mb-1">{college.name}</strong>
                                <span className="text-gray-500 text-xs">{college.state} · {college.type}</span>
                                {college.programs?.length > 0 && (
                                    <p className="text-xs mt-1 text-gray-600">
                                        {college.programs.slice(0, 3).join(', ')}
                                        {college.programs.length > 3 ? '...' : ''}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default CollegeMap;
