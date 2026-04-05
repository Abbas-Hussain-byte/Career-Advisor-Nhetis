import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import CollegeMap from '../components/CollegeMap';

// ── Career category → relevant college programs mapping ──────────────────────
const CATEGORY_PROGRAMS_MAP: Record<string, string[]> = {
    'Technology': ['B.Tech', 'BE', 'BCA', 'MCA', 'M.Tech', 'BSc IT', 'Diploma in CS', 'Diploma in ECE', 'B.Sc (Research)'],
    'Engineering': ['B.Tech', 'BE', 'M.Tech', 'ME', 'Diploma in Mechanical', 'Diploma in Civil', 'BArch'],
    'Medical': ['MBBS', 'MD', 'MS', 'BDS', 'B.Pharm', 'B.Sc Nursing', 'DM', 'BAMS', 'BHMS'],
    'Agriculture': ['BSc Agriculture', 'MSc Agriculture', 'B.Tech Food Tech', 'BTech Agri Engineering', 'Veterinary'],
    'Commerce': ['B.Com', 'BMS', 'BAF', 'MBA', 'M.Com', 'B.A. (H) Economics', 'B.Com (H)', 'B.Com (Banking)'],
    'Business': ['MBA', 'BBA', 'B.Com', 'M.Com', 'Executive MBA'],
    'Arts & Design': ['BFA', 'B.Des', 'M.Des', 'MFA', 'BMus', 'BArch', 'Diploma in Design'],
    'Media': ['BA', 'MA', 'BFA', 'BMus'],
    'Education': ['BA', 'MA', 'BSc', 'MSc', 'M.Phil', 'PhD'],
    'Law': ['BA LLB', 'LLB', 'BBA LLB', 'LLM', 'MBA (Law)'],
};

// Stream → keyword mapping (fallback when no assessment)
const STREAM_PROGRAMS: Record<string, string[]> = {
    'Science-PCM': ['B.Tech', 'M.Tech', 'BSc', 'Engineering', 'CS', 'IT', 'Mech', 'Civil', 'ECE', 'Architecture'],
    'Science-PCB': ['MBBS', 'BDS', 'BSc', 'B.Pharm', 'Agriculture', 'Nursing', 'MD', 'MS', 'BVSc'],
    'Commerce': ['B.Com', 'BBA', 'MBA', 'CA', 'MCA', 'BCom', 'Finance', 'Management'],
    'Arts / Humanities': ['BA', 'BFA', 'LLB', 'BDes', 'Journalism', 'MA', 'BSW', 'Fine Arts', 'Design'],
    'Vocational': ['Diploma', 'ITI', 'Polytechnic', 'B.Tech', 'Mech'],
};

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Colleges() {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const userStream = user?.profile?.stream || '';
    const userAssessment = user?.assessment;
    const hasAssessment = !!(userAssessment?.results?.length);

    // ── Derive relevant programs from assessment careers (primary) or stream (fallback) ──
    const assessmentPrograms = useMemo(() => {
        const progs = new Set<string>();
        if (hasAssessment) {
            (userAssessment.results || []).forEach((r: any) => {
                const catProgs = CATEGORY_PROGRAMS_MAP[r.category] || [];
                catProgs.forEach(p => progs.add(p));
            });
        }
        if (progs.size === 0 && userStream) {
            // fallback: use stream keywords
            (STREAM_PROGRAMS[userStream] || []).forEach(kw => progs.add(kw));
        }
        return progs;
    }, [hasAssessment, userAssessment, userStream]);

    // ── Assessment career categories for display ──
    const assessmentCategories = useMemo(() => {
        if (!hasAssessment) return [];
        return (userAssessment.results || []).map((r: any) => r.category).filter(Boolean);
    }, [hasAssessment, userAssessment]);

    const programMatchScore = (college: any) => {
        if (assessmentPrograms.size === 0) return 0;
        return (college.programs || []).filter((p: string) =>
            [...assessmentPrograms].some(kw => p.toLowerCase().includes(kw.toLowerCase()))
        ).length;
    };

    const handleLogout = () => {
        logoutUser();
        navigate('/');
    };
    const [colleges, setColleges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [state, setState] = useState('');
    const [program, setProgram] = useState('');
    const [useLocation, setUseLocation] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sortBy, setSortBy] = useState<'bestMatch' | 'ranking' | 'nearest' | 'state'>('bestMatch');

    const fetchColleges = async (params: any = {}) => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (params.state) query.set('state', params.state);
            if (params.program) query.set('program', params.program);
            if (params.lat) { query.set('lat', params.lat); query.set('lng', params.lng); }
            const { data } = await API.get(`/colleges?${query.toString()}`);
            setColleges(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchColleges({});
    }, []);

    // Try to get user location on mount for distance sorting
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                () => { } // silently fail
            );
        }
    }, []);

    const handleLocationSearch = () => {
        if (!navigator.geolocation) return alert('Geolocation not supported');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);
                setUseLocation(true);
                fetchColleges({ lat: loc.lat, lng: loc.lng });
            },
            () => alert('Unable to get location. Please enable location access.')
        );
    };

    const handleSearch = () => {
        fetchColleges(useLocation && userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : { state, program });
    };

    const handleReset = () => {
        setState('');
        setProgram('');
        setUseLocation(false);
        fetchColleges({});
    };

    // ── Compute distance for each college ──
    const collegesWithDistance = useMemo(() => {
        return colleges.map(c => {
            let dist: number | null = null;
            if (userLocation && c.location?.coordinates) {
                const [lng, lat] = c.location.coordinates;
                dist = Math.round(haversineDistance(userLocation.lat, userLocation.lng, lat, lng));
            }
            return { ...c, _distance: dist };
        });
    }, [colleges, userLocation]);

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            {/* Navbar */}
            <nav className="bg-[#0A2540] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-xl font-extrabold"><span className="text-[#00D4FF]">N</span>HETIS</Link>
                    <div className="hidden md:flex items-center gap-6 text-sm">
                        <Link to="/dashboard" className="hover:text-[#00D4FF] transition">Dashboard</Link>
                        <Link to="/careers" className="hover:text-[#00D4FF] transition">Careers</Link>
                        <Link to="/colleges" className="text-[#00D4FF] font-semibold">Colleges</Link>
                        <Link to="/insights" className="hover:text-[#00D4FF] transition">Insights</Link>
                        <Link to="/profile" className="hover:text-[#00D4FF] transition">Profile</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden md:block text-sm text-gray-300">{user?.name}</span>
                        <button onClick={handleLogout} className="bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-white/20 transition">Logout</button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">Government Colleges</h1>
                    <p className="text-gray-500 mt-2">Find quality government colleges matching your career path</p>
                </div>

                {/* Assessment-based suggestions banner */}
                {hasAssessment && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-[#635BFF]/10 to-[#00D4FF]/10 border border-[#635BFF]/20 rounded-2xl px-6 py-4 mb-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#0A2540]">🎯 Showing colleges for your assessment results:</span>
                            {(userAssessment.results || []).slice(0, 3).map((r: any) => (
                                <span key={r.careerTitle} className="text-xs px-3 py-1 rounded-full bg-[#635BFF]/15 text-[#635BFF] font-semibold">
                                    {r.careerTitle} ({r.score}%)
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Colleges with matching programs are ranked higher. Use search to find additional colleges.
                        </p>
                    </motion.div>
                )}

                {/* Search Controls */}
                <div className="glass rounded-2xl p-6 mb-8">
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="State (e.g. Telangana)"
                            value={state}
                            onChange={e => setState(e.target.value)}
                            className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                            disabled={useLocation}
                        />
                        <input
                            type="text"
                            placeholder="Program (e.g. B.Tech, MBBS)"
                            value={program}
                            onChange={e => setProgram(e.target.value)}
                            className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                        />
                        <button
                            onClick={handleSearch}
                            className="bg-[#0A2540] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1a3d66] transition"
                        >
                            Search
                        </button>
                        <button
                            onClick={handleReset}
                            className="border-2 border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-medium hover:border-gray-400 transition"
                        >
                            Reset
                        </button>
                    </div>
                    <button
                        onClick={handleLocationSearch}
                        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition ${useLocation
                            ? 'bg-[#00D4FF]/20 text-[#0A2540] border-2 border-[#00D4FF]'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        📍 {useLocation ? 'Using your location (100km radius)' : 'Use My Location'}
                    </button>
                </div>

                {/* View Toggle + Sort Controls */}
                <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                    <div>
                        <p className="text-gray-500 text-sm">{colleges.length} colleges found</p>
                        {hasAssessment && (
                            <p className="text-xs text-[#635BFF] mt-0.5 font-medium">
                                Sorted for: {assessmentCategories.join(', ')} careers
                            </p>
                        )}
                        {!hasAssessment && userStream && (
                            <p className="text-xs text-[#635BFF] mt-0.5 font-medium">
                                Sorted for: {userStream} stream
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* Sort */}
                        {(['bestMatch', 'ranking', 'nearest', 'state'] as const).map(s => (
                            <button key={s} onClick={() => setSortBy(s)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${sortBy === s ? 'bg-[#635BFF] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#635BFF]'
                                    }`}
                                disabled={s === 'nearest' && !userLocation}
                                title={s === 'nearest' && !userLocation ? 'Enable location to use this sort' : ''}
                            >
                                {s === 'bestMatch' ? '⭐ Best Match' : s === 'ranking' ? '🏆 By Ranking' : s === 'nearest' ? '📍 Nearest' : '🗺️ State A→Z'}
                            </button>
                        ))}
                        <div className="w-px bg-gray-200 self-stretch" />
                        {/* View */}
                        <button onClick={() => setViewMode('list')}
                            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition ${viewMode === 'list' ? 'bg-[#0A2540] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                            📋 List
                        </button>
                        <button onClick={() => setViewMode('map')}
                            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition ${viewMode === 'map' ? 'bg-[#0A2540] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                            🗺️ Map
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="spinner mx-auto mb-3"></div>
                        <p className="text-gray-500">Finding colleges...</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'map' && colleges.length > 0 && (
                            <div className="mb-8">
                                <CollegeMap colleges={colleges} />
                            </div>
                        )}

                        {viewMode === 'list' && (() => {
                            const sorted = [...collegesWithDistance].sort((a, b) => {
                                if (sortBy === 'bestMatch') {
                                    const diff = programMatchScore(b) - programMatchScore(a);
                                    if (diff !== 0) return diff;
                                    return (a.ranking || 999) - (b.ranking || 999);
                                } else if (sortBy === 'ranking') {
                                    return (a.ranking || 999) - (b.ranking || 999);
                                } else if (sortBy === 'nearest') {
                                    return (a._distance ?? 99999) - (b._distance ?? 99999);
                                } else {
                                    return (a.state || '').localeCompare(b.state || '');
                                }
                            });
                            return (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sorted.length === 0 ? (
                                        <div className="col-span-3 text-center py-12 text-gray-400">
                                            No colleges found. Try different filters.
                                        </div>
                                    ) : (
                                        sorted.map((college, i) => {
                                            const matchScore = programMatchScore(college);
                                            const isRelevant = matchScore > 0;
                                            return (
                                                <motion.div
                                                    key={college._id || i}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.04 }}
                                                    className="glass rounded-2xl p-6 card-hover"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h3 className="text-base font-bold text-[#0A2540] leading-tight">{college.name}</h3>
                                                        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${college.type === 'Government' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                                                }`}>{college.type}</span>
                                                            {isRelevant && (
                                                                <span className="text-xs bg-[#635BFF]/10 text-[#635BFF] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                    ✓ Matches
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-400 text-xs mb-2">📍 {college.address || college.state}</p>

                                                    {/* Ranking + Distance row */}
                                                    <div className="flex items-center gap-3 mb-3">
                                                        {college.ranking && (
                                                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                🏆 Rank #{college.ranking}
                                                            </span>
                                                        )}
                                                        {college._distance != null && (
                                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                📍 {college._distance} km away
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Programs */}
                                                    <div className="flex flex-wrap gap-1 mb-4">
                                                        {college.programs?.slice(0, 4).map((p: string) => {
                                                            const isMatching = [...assessmentPrograms].some(kw => p.toLowerCase().includes(kw.toLowerCase()));
                                                            return (
                                                                <span key={p} className={`text-xs px-2 py-0.5 rounded ${isMatching
                                                                    ? 'bg-[#635BFF]/10 text-[#635BFF] font-medium'
                                                                    : 'bg-blue-50 text-blue-700'
                                                                    }`}>{p}</span>
                                                            );
                                                        })}
                                                        {college.programs?.length > 4 && (
                                                            <span className="text-xs text-gray-400">+{college.programs.length - 4} more</span>
                                                        )}
                                                    </div>

                                                    {/* Facilities */}
                                                    {college.facilities?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {college.facilities.slice(0, 3).map((f: string) => (
                                                                <span key={f} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">{f}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>
                            );
                        })()}
                    </>
                )}
            </main>
        </div>
    );
}
