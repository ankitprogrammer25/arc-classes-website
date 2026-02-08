require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 🟢 DATABASE CONNECTION (Network Block Fix)
// ==========================================
// We use the "Long Link" format to bypass your ISP/DNS block.
// REPLACE <password> with your real password 'MYPASSWORDG' (no brackets)
const DB_LINK = "mongodb://ankitprogrammer25:MYPASSWORDG@cluster0-shard-00-00.0dhqpzv.mongodb.net:27017,cluster0-shard-00-01.0dhqpzv.mongodb.net:27017,cluster0-shard-00-02.0dhqpzv.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-0dhqpzv-shard-0&authSource=admin&retryWrites=true&w=majority";

console.log("⏳ Connecting to Database...");

mongoose.connect(DB_LINK)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => {
        console.log("❌ DB Connection Failed:", err.message);
    });

// 📌 SCHEMAS
const studentSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true }, // Acts as Username
    password: String,
    batch: { type: String, default: '2025-26' }
});
const Student = mongoose.model('Student', studentSchema);

// ==========================================
// 🟢 API ROUTES
// ==========================================

// 1. LOGIN (For both Student & Admin)
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;

    // A. Admin Login (Hardcoded for safety)
    if (role === 'admin') {
        if (email === 'admin@arc.com' && password === 'admin123') {
            return res.json({ success: true, name: 'Ankit Sir', email, role: 'admin' });
        } else {
            return res.json({ success: false, message: 'Invalid Admin Credentials' });
        }
    }

    // B. Student Login (Check Database)
    try {
        const user = await Student.findOne({ email, password });
        if (user) {
            res.json({ success: true, name: user.name, email: user.email, role: 'student' });
        } else {
            res.json({ success: false, message: 'Invalid Username or Password' });
        }
    } catch (e) {
        res.json({ success: false, message: 'Server Error' });
    }
});

// 2. CREATE STUDENT (Admin Only)
app.post('/api/admin/create-student', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if username exists
        const exists = await Student.findOne({ email });
        if(exists) return res.json({ success: false, message: "Username already exists!" });

        const newStudent = new Student({ name, email, password });
        await newStudent.save();
        
        console.log(`✅ Created Student: ${name} (${email})`);
        res.json({ success: true, message: "Student Created Successfully!" });
    } catch (e) {
        console.log("Create Error:", e);
        res.json({ success: false, message: "Could not create student." });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));