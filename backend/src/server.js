const dotenv = require('dotenv');
// Load .env BEFORE any other imports that depend on env vars
dotenv.config();

const connectDB = require('./config/db');
const app = require('./app');

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT} (IPv4)`);
});
