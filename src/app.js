const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// Middleware Dasar
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check (untuk testing awal)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Express running on port ${PORT}`));