const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Build a rich system prompt from the user's saved profile ─────────────────
function buildSystemPrompt(user) {
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

## Your Role
You guide this specific student based solely on their profile above. Your advice must be:
1. **Hyper-personalised** — always connect your answers to their stream, interests, aptitude, and matched careers.
2. **India-specific** — mention Indian colleges (IITs, NITs, AIIMS, government colleges), Indian job market, NIRF rankings, entrance exams (JEE, NEET, CLAT, CAT, GATE etc.), and salary figures in ₹ lakhs.
3. **Actionable** — give specific steps, timelines, and resources, not vague advice.
4. **Honest** — if their aptitude scores suggest a career is a poor fit, say so kindly and redirect them.
5. **Concise** — keep responses under 300 words unless the student asks for detail. Use bullet points for lists.

## What you can help with
- Career path selection and comparison
- College choices and entrance exam strategy
- Skill gaps and what to learn next
- Course recommendations (online + offline)
- Day-in-the-life of specific careers
- Salary ranges and job market demand in India

## Personality
Be warm, encouraging, and direct — like a knowledgeable senior who genuinely cares. Avoid generic motivational fluff. Start responses conversationally (no robotic "Of course!" openers).`;
}

// ── Chat model instance (created per-request to avoid stale state) ────────────
function getModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            temperature: 0.75,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 600,
        },
    });
}

// ── POST /api/chat ─────────────────────────────────────────────────────────────
// Body: { message: string, history: [{ role: 'user'|'model', parts: [{ text }] }] }
const chat = asyncHandler(async (req, res) => {
    const { message, history = [] } = req.body;
    const user = req.user;

    if (!message?.trim()) {
        res.status(400);
        throw new Error('Message is required');
    }

    const model = getModel();
    const systemPrompt = buildSystemPrompt(user);

    // Inject system prompt as first model turn if history is empty
    const fullHistory = history.length === 0
        ? [
            { role: 'user', parts: [{ text: 'Hello, who are you?' }] },
            { role: 'model', parts: [{ text: `Hi! I'm your NHETIS career guide. Based on your profile — ${user?.name || 'student'} — I'm here to give you personalised career and college advice. What's on your mind?` }] },
        ]
        : history;

    // Send systemPrompt as a prepended user message in the first turn when history starts fresh
    const chatSession = model.startChat({
        history: fullHistory,
        systemInstruction: systemPrompt,
    });

    const result = await chatSession.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply, role: 'model' });
});

module.exports = { chat };
