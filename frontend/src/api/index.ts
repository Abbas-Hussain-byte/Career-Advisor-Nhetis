import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api',
});

API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

// Auth
export const login = (formData: any) => API.post('/users/login', formData);
export const register = (formData: any) => API.post('/users', formData);
export const fetchProfile = () => API.get('/users/profile');
export const updateProfile = (data: any) => API.put('/users/profile', data);
export const updateLanguage = (language: string) => API.put('/users/language', { language });

// Careers
export const getCareers = (params?: any) => API.get('/careers', { params });
export const getRecommendations = (data: any) => API.post('/careers/recommend', data);
export const getStreamRecommendation = (data: any) => API.post('/careers/recommend-stream', data);
export const seedDatabase = () => API.post('/careers/seed');

// Colleges
export const getColleges = (params?: any) => API.get('/colleges', { params });

// Aptitude
export const getQuestions = () => API.get('/aptitude');

// Chat (AI Chatbot)
export const sendChatMessage = (message: string, history: any[]) =>
    API.post('/chat', { message, history });

// Scholarships
export const getScholarships = (params?: any) => API.get('/scholarships', { params });
export const getPersonalizedScholarships = () => API.get('/scholarships/personalized');

// Study Resources
export const getResources = (params?: any) => API.get('/resources', { params });
export const getRecommendedResources = () => API.get('/resources/recommended');

// Timeline
export const getTimeline = (params?: any) => API.get('/timeline', { params });
export const getUpcomingEvents = () => API.get('/timeline/upcoming');

export default API;

