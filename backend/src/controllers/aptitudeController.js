const questions = require('../data/questions.js');

const getQuestions = (req, res) => {
    // Return all 25 questions in a randomised order so every attempt feels fresh
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    res.json(shuffled);
};

module.exports = { getQuestions };
