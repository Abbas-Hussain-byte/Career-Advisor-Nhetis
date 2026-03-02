const questions = require('../data/questions.js');

const getQuestions = (req, res) => {
    // Randomly shuffle questions and return 10 to make quiz dynamic
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    res.json(selected);
};

module.exports = { getQuestions };
