import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import CollegeMap from '../components/CollegeMap';

export default function Colleges() {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const userStream = user?.profile?.stream || '';
    const userAssessment = user?.assessment;

    // Which program keywords match which streams
    const STREAM_PROGRAMS: Record<string, string[]> = {
        'Science-PCM': ['B.Tech', 'M.Tech', 'BSc', 'Engineering', 'CS', 'IT', 'Mech', 'Civil', 'ECE', 'Architecture'],
        'Science-PCB': ['MBBS', 'BDS', 'BSc', 'B.Pharm', 'Agriculture', 'Nursing', 'MD', 'MS', 'BVSc'],
        'Commerce': ['B.Com', 'BBA', 'MBA', 'CA', 'MCA', 'BCom', 'Finance', 'Management'],
        'Arts / Humanities': ['BA', 'BFA', 'LLB', 'BDes', 'Journalism', 'MA', 'BSW', 'Fine Arts', 'Design'],
        'Vocational': ['Diploma', 'ITI', 'Polytechnic', 'B.Tech', 'Mech'],
    };

    const programMatchScore = (college: any) => {
        const progList = (userStream ? STREAM_PROGRAMS[userStream] : null);
        if (!progList || !college.programs?.length) return 0;
        return college.programs.filter((p: string) =>
            progList.some(kw => p.toLowerCase().includes(kw.toLowerCase()))
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
    const [sortBy, setSortBy] = useState<'bestMatch' | 'ranking' | 'state'>('bestMatch');

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
        setUserLocation(null);
        fetchColleges({});
    };

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
                    <p className="text-gray-500 mt-2">Find quality government colleges near you or by state</p>
                </div>

                {/* Search Controls */}
                <div className="glass rounded-2xl p-6 mb-8">
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="State (e.g. Telangana)"
                            value={state}
                            onChange={e => setState(e.target.value)}
                            className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition"
                            disabled={useLocation}
                        />
                        <input
                            type="text"
                            placeholder="Program (e.g. B.Tech, MBBS)"
                            value={program}
                            onChange={e => setProgram(e.target.value)}
                            className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition"
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
                        {userStream && (
                            <p className="text-xs text-[#635BFF] mt-0.5 font-medium">
                                Sorted for: {userStream} stream
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* Sort */}
                        {(['bestMatch', 'ranking', 'state'] as const).map(s => (
                            <button key={s} onClick={() => setSortBy(s)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${sortBy === s ? 'bg-[#635BFF] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#635BFF]'
                                    }`}>
                                {s === 'bestMatch' ? '⭐ Best Match' : s === 'ranking' ? '🏆 By Ranking' : '🗺️ State A→Z'}
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
                            const sorted = [...colleges].sort((a, b) => {
                                if (sortBy === 'bestMatch') {
                                    return programMatchScore(b) - programMatchScore(a);
                                } else if (sortBy === 'ranking') {
                                    return (a.ranking || 999) - (b.ranking || 999);
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
                                                            {matchScore > 0 && (
                                                                <span className="text-xs bg-[#635BFF]/10 text-[#635BFF] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                    ✓ Matches {userStream}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-400 text-xs mb-3">📍 {college.address || college.state}</p>

                                                    {/* Programs */}
                                                    <div className="flex flex-wrap gap-1 mb-4">
                                                        {college.programs?.slice(0, 4).map((p: string) => (
                                                            <span key={p} className={`text-xs px-2 py-0.5 rounded ${(STREAM_PROGRAMS[userStream] || []).some(kw => p.toLowerCase().includes(kw.toLowerCase()))
                                                                    ? 'bg-[#635BFF]/10 text-[#635BFF] font-medium'
                                                                    : 'bg-blue-50 text-blue-700'
                                                                }`}>{p}</span>
                                                        ))}
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
