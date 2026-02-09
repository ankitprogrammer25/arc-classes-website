require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🟢 DATABASE CONNECTION
// ==========================================
const DB_LINK = "mongodb://ankitprogrammer25:a32x05sYvukG178G@cluster0-shard-00-00.0dhqpzv.mongodb.net:27017,cluster0-shard-00-01.0dhqpzv.mongodb.net:27017,cluster0-shard-00-02.0dhqpzv.mongodb.net:27017/arc_database?ssl=true&replicaSet=atlas-0dhqpzv-shard-0&authSource=admin&retryWrites=true&w=majority";

console.log("⏳ Connecting to Database...");

mongoose.connect(DB_LINK)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.log("❌ DB Connection Failed:", err.message));

// ==========================================
// 📌 SCHEMAS
// ==========================================

// 1. Student User (UPDATED as per requirements)
const Student = mongoose.model('Student', new mongoose.Schema({
    username: { type: String, unique: true }, // Used for login
    email: String,
    mobile: String,
    password: String
}));

// 2. Schedule
const Schedule = mongoose.model('Schedule', new mongoose.Schema({
    title: String,
    date: String,
    link: String
}));

// 3. Results
const Result = mongoose.model('Result', new mongoose.Schema({
    title: String,
    link: String,
    date: String
}));

// 4. Library
const Material = mongoose.model('Material', new mongoose.Schema({
    title: String,
    category: String,
    link: String
}));

// 5. Live Test
const Test = mongoose.model('Test', new mongoose.Schema({
    title: String,
    questions: Array,
    active: Boolean
}));

// ==========================================
// 🚀 API ROUTES
// ==========================================

// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;

    // 1. Admin Login
    if (role === 'admin') {
        if (username === 'admin' && password === 'admin123') {
            return res.json({ success: true, name: 'Ankit Sir', role: 'admin' });
        }
        return res.json({ success: false, message: 'Invalid Admin Password' });
    }

    // 2. Student Login
    try {
        // Find student by username and password
        const user = await Student.findOne({ username, password });
        if (user) {
            // We use username as the display name since 'name' field was removed
            res.json({ success: true, name: user.username, role: 'student' });
        } else {
            res.json({ success: false, message: 'Wrong Credentials' });
        }
    } catch (e) { 
        res.json({ success: false, message: 'Server Error' }); 
    }
});

// --- ADMIN: CREATE STUDENT ---
app.post('/api/create-student', async (req, res) => {
    try {
        // Updated to accept new fields
        const { username, email, mobile, password } = req.body;
        
        const exists = await Student.findOne({ username });
        if(exists) return res.json({ success: false, message: "Username already taken!" });

        await new Student({ username, email, mobile, password }).save();
        res.json({ success: true, message: "Student Registered Successfully!" });
    } catch (e) { 
        res.json({ success: false, message: "Error Creating Student" }); 
    }
});

// --- SCHEDULE ROUTES ---
app.get('/api/schedule', async (req, res) => res.json(await Schedule.find().sort({_id:-1})));
app.post('/api/schedule', async (req, res) => {
    await new Schedule(req.body).save();
    res.json({ success: true });
});

// --- RESULT ROUTES ---
app.get('/api/results', async (req, res) => res.json(await Result.find().sort({_id:-1})));
app.post('/api/results', async (req, res) => {
    await new Result(req.body).save();
    res.json({ success: true });
});

// --- LIBRARY ROUTES ---
app.get('/api/library', async (req, res) => res.json(await Material.find().sort({_id:-1})));
app.post('/api/library', async (req, res) => {
    await new Material(req.body).save();
    res.json({ success: true });
});

// --- LIVE TEST ROUTES ---
app.get('/api/test', async (req, res) => res.json(await Test.findOne({ active: true })));
app.post('/api/test', async (req, res) => {
    await Test.updateMany({}, { active: false });
    const newTest = new Test({ ...req.body, active: true });
    await newTest.save();
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Running on Port ${PORT}`));