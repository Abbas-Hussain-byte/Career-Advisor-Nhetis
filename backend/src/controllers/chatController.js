const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const CareerPath = require('../models/careerPathModel');

// ── Build a rich system prompt from the user's saved profile ─────────────────
function buildSystemPrompt(user, sessionLanguage = 'English') {
    const profile = user?.profile || {};
    const assess = user?.assessment || {};
    const results = assess.results || [];
    const vector = assess.vector || {};

    // Top 3 career matches
    const topCareers = results.slice(0, 3).map(r =>
        `${r.careerTitle} (match score: ${Math.round((r.score || 0) * 100)}%)`
    ).join(', ') || 'Not yet assessed';

    // Skill ratings from self-rating stage
    const skillRatings = vector._skillRatings
        ? Object.entries(vector._skillRatings)
            .map(([k, v]) => `${k}: ${v + 1}/5`)
            .slice(0, 10)
            .join(', ')
        : 'Not yet provided';

    // Aptitude vector
    const aptitude = ['logic', 'technical', 'creativity', 'social', 'leadership']
        .filter(k => vector[k] !== undefined)
        .map(k => `${k}: ${Math.round(vector[k] * 100)}%`)
        .join(' | ') || 'Not yet assessed';

    return `You are NHETIS — an expert, friendly, and highly personalised AI career guidance counsellor for Indian students.

## Student Profile
- **Name:** ${user.name || 'Student'}
- **Stream:** ${profile.stream || 'Not specified'}
- **Grade / Class:** ${profile.grade || 'Not specified'}
- **Location:** ${profile.city || 'India'}
- **Academic Score:** ${profile.academicScore ? `${profile.academicScore}%` : 'Not specified'}
- **Interests:** ${(profile.interests || []).join(', ') || 'Not specified'}

## Assessment Results
- **Top Recommended Careers:** ${topCareers}
- **Aptitude Profile:** ${aptitude}
- **Skill Self-Ratings:** ${skillRatings}

## Current Session Language
- **Language:** ${sessionLanguage} (Respond PRIMARILY in this language)

## Your Role
You guide this specific student based solely on their profile above. Your advice must be:
1. **Hyper-personalised** — always connect your answers to their stream, interests, aptitude, and matched careers.
2. **India-specific** — mention Indian colleges (IITs, NITs, AIIMS, government colleges), Indian job market, NIRF rankings, entrance exams (JEE, NEET, CLAT, CAT, GATE etc.), and salary figures in ₹ lakhs.
3. **Actionable** — give specific steps, timelines, and resources, not vague advice.
4. **Honest** — if their aptitude scores suggest a career is a poor fit, say so kindly and redirect them.
5. **Well-Formatted** — Use Markdown (**bold**, *lists*, # headers) to make your answers easy to read. NEVER return raw code blocks or special symbols that aren't markdown.
6. **Complete** — Provide full, detailed answers. Do NOT cut off mid-sentence. Ensure the response is logically concluded.
7. **Multi-lingual Awareness** — You are responding in ${sessionLanguage}. 
   **CRITICAL RULE:** If the language is Hindi, you MUST write exclusively in the native Devanagari script (e.g. नमस्ते, आप कैसे हैं?). Do NOT use Hinglish or Latin characters. If the language is Telugu, use native Telugu script.

## Dynamic Profile Updating
If during the conversation the student explicitly shows interest in, or decides on, a specific new career path that differs from their top matches (e.g., they say "I want to be a Hardware Engineer" or "Tell me about being an Entrepreneur"), you MUST append this exact tag at the very end of your response:
||UPDATE_GOAL: <Career Title>||
Replace <Career Title> with a generalized title (e.g., "Hardware Engineer", "Entrepreneur", "Doctor", "Software Engineer").

## Personality
Be warm, encouraging, and direct — like a knowledgeable senior who genuinely cares. Avoid generic motivational fluff. Start responses conversationally.`;
}

// ── Chat model instance (created per-request to avoid stale state) ────────────
function getModel(systemPrompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        systemInstruction: {
            role: "system",
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        },
    });
}

// ── POST /api/chat ─────────────────────────────────────────────────────────────
// Body: { message: string, history: [{ role: 'user'|'model', parts: [{ text }] }] }
const chat = asyncHandler(async (req, res) => {
    const { message, history = [], language = 'English' } = req.body;
    const user = req.user;

    if (!message?.trim()) {
        res.status(400);
        throw new Error('Message is required');
    }

    const systemPrompt = buildSystemPrompt(user, language);
    const model = getModel(systemPrompt);

    // Sanitize incoming history: Gemini strictly requires roles to be 'user' or 'model'
    // and the first message MUST be from 'user'.
    let sanitizedHistory = (history || []).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : (msg.role || 'user'),
        parts: msg.parts || [{ text: '' }]
    }));

    // If the frontend sent a history that starts with a 'model' greeting, 
    // Gemini will crash. Prepend a dummy user message to satisfy validation.
    if (sanitizedHistory.length > 0 && sanitizedHistory[0].role === 'model') {
        sanitizedHistory.unshift({ role: 'user', parts: [{ text: 'Hello, who are you?' }] });
    }

    // Inject system prompt as first model turn if history is completely empty
    const fullHistory = sanitizedHistory.length === 0
        ? [
            { role: 'user', parts: [{ text: 'Hello, who are you?' }] },
            { role: 'model', parts: [{ text: `Hi! I'm your NHETIS career guide. Based on your profile — ${user?.name || 'student'} — I'm here to give you personalised career and college advice. What's on your mind?` }] },
        ]
        : sanitizedHistory;

    const chatSession = model.startChat({
        history: fullHistory,
    });

    const result = await chatSession.sendMessage(message);
    let reply = result.response.text();
    let profileUpdated = false;

    // Intercept dynamic goal updates
    const updateMatch = reply.match(/\|\|UPDATE_GOAL:\s*(.*?)\|\|/i);
    if (updateMatch) {
        const newGoal = updateMatch[1].trim();
        reply = reply.replace(updateMatch[0], '').trim(); // Remove tag from user view

        try {
            // Find a matching career in the database
            const career = await CareerPath.findOne({ title: { $regex: newGoal, $options: 'i' } });
            if (career) {
                // Ensure assessment object exists
                if (!user.assessment) user.assessment = { results: [], vector: {} };
                if (!user.assessment.results) user.assessment.results = [];
                
                // Remove if it already exists to avoid duplicates
                user.assessment.results = user.assessment.results.filter(r => r.careerTitle !== career.title);
                
                // Add to the top of results with a high score
                user.assessment.results.unshift({
                    careerTitle: career.title,
                    score: 0.95,
                    category: career.category,
                    skills: career.skills || []
                });
                
                // Keep only top 5
                user.assessment.results = user.assessment.results.slice(0, 5);
                await user.save();
                profileUpdated = true;
            }
        } catch (e) {
            console.error('Failed to update goal from chat:', e);
        }
    }

    res.json({ reply, role: 'model', profileUpdated });
});

module.exports = { chat };
