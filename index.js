require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// 1. MIDDLEWARE (Allows large data for blogs/images)
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🟢 DATABASE CONNECTION (Network Block Fix)
// ==========================================
// This "Long Link" bypasses WiFi/Hotspot blocks.
// 👇 IMPORTANT: REPLACE 'MYPASSWORDG' WITH YOUR REAL PASSWORD BELOW
const DB_LINK = "mongodb://ankitprogrammer25:a32x05sYvukG178G@cluster0-shard-00-00.0dhqpzv.mongodb.net:27017,cluster0-shard-00-01.0dhqpzv.mongodb.net:27017,cluster0-shard-00-02.0dhqpzv.mongodb.net:27017/arc_database?ssl=true&replicaSet=atlas-0dhqpzv-shard-0&authSource=admin&retryWrites=true&w=majority";

console.log("⏳ Connecting to Database...");

mongoose.connect(DB_LINK)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.log("❌ DB Connection Failed:", err.message));

// ==========================================
// 📌 DATA MODELS (Schemas)
// ==========================================
const Student = mongoose.model('Student', new mongoose.Schema({
    name: String,
    username: { type: String, unique: true }, // Simple username (e.g., rahul123)
    password: String,
    batch: String
}));

const Post = mongoose.model('Post', new mongoose.Schema({
    type: String, // 'schedule', 'result', 'blog'
    title: String,
    content: String, // Can be a Link or Blog Text
    date: String
}));

// ==========================================
// 🚀 API ROUTES
// ==========================================

// 1. LOGIN (Admin + Student)
app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;

    // A. Admin Login (Hardcoded)
    if (role === 'admin') {
        if (username === 'admin' && password === 'admin123') {
            return res.json({ success: true, name: 'Ankit Sir', role: 'admin' });
        } else {
            return res.json({ success: false, message: 'Invalid Admin Password' });
        }
    }

    // B. Student Login (Database)
    try {
        const user = await Student.findOne({ username, password });
        if (user) {
            res.json({ success: true, name: user.name, role: 'student' });
        } else {
            res.json({ success: false, message: 'Wrong Username or Password' });
        }
    } catch (e) {
        res.json({ success: false, message: 'Server Error' });
    }
});

// 2. CREATE STUDENT (Admin Only)
app.post('/api/create-student', async (req, res) => {
    try {
        const { name, username, password, batch } = req.body;
        const exists = await Student.findOne({ username });
        if(exists) return res.json({ success: false, message: "Username already taken!" });

        await new Student({ name, username, password, batch }).save();
        res.json({ success: true, message: "Student Created!" });
    } catch (e) {
        res.json({ success: false, message: "Error creating student." });
    }
});

// 3. MANAGE POSTS (Schedule, Results, Blogs)
app.get('/api/posts/:type', async (req, res) => {
    const posts = await Post.find({ type: req.params.type }).sort({_id: -1});
    res.json(posts);
});

app.post('/api/posts', async (req, res) => {
    await new Post(req.body).save();
    res.json({ success: true });
});

app.delete('/api/posts/:id', async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Running on Port ${PORT}`));