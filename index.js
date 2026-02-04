require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. PERMANENT DATABASE CONNECTION ---
// This link connects to your MongoDB Cloud (Free Forever)
// It works on Render even if it fails on your Laptop WiFi!
const dbLink = "mongodb://ankitprogrammer25:a32x05sYvukG178G@cluster0-shard-00-00.0dhqpzv.mongodb.net:27017,cluster0-shard-00-01.0dhqpzv.mongodb.net:27017,cluster0-shard-00-02.0dhqpzv.mongodb.net:27017/?ssl=true&replicaSet=atlas-0dhqpzv-shard-0&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(dbLink)
    .then(() => console.log('✅ Connected to MongoDB Cloud (Data is Safe!)'))
    .catch(err => console.log('❌ Connection Error:', err));

// --- 2. DATA MODELS ---
// Student Result Schema
const ResultSchema = new mongoose.Schema({
    studentName: String, // You can add login name later
    score: Number,
    total: Number,
    date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

// File Upload Schema
const MaterialSchema = new mongoose.Schema({
    title: String,
    type: String,
    date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

// --- 3. API ROUTES ---

// Upload Material
app.post('/api/upload', async (req, res) => {
    try {
        const newFile = new Material(req.body);
        await newFile.save(); // Saves to Cloud
        res.json({ success: true, message: "Saved to Cloud Database!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Materials
app.get('/api/materials', async (req, res) => {
    const files = await Material.find().sort({ date: -1 });
    res.json(files);
});

// Submit Test Result
app.post('/api/submit-test', async (req, res) => {
    const { answers } = req.body;
    
    // Hardcoded Answer Key (0=A, 1=B, etc.)
    const correctAnswers = [0, 1]; // Q1=Option 0, Q2=Option 1
    
    let score = 0;
    correctAnswers.forEach((ans, index) => {
        if(answers[index] === ans) score += 4;
        else if(answers[index] !== null) score -= 1;
    });

    // Save Result to MongoDB
    const newResult = new Result({
        score: score,
        total: correctAnswers.length * 4
    });
    await newResult.save();

    // Get Rank
    const totalStudents = await Result.countDocuments();
    const betterStudents = await Result.countDocuments({ score: { $gt: score } });
    const rank = betterStudents + 1;

    res.json({ success: true, score, rank, totalStudents });
});

// Get Test Questions
app.get('/api/test', (req, res) => {
    // We send questions without answers to the student
    const questions = [
        { id: 1, text: "What is the unit of Force?", options: ["Newton", "Joule", "Watt", "Pascal"] },
        { id: 2, text: "Electron was discovered by?", options: ["Rutherford", "Thomson", "Bohr", "Newton"] }
    ];
    res.json(questions);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 ARC Server running on port ${PORT}`);
});