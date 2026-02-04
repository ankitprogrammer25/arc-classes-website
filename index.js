require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
// Increase limit for large images
app.use(express.json({ limit: '50mb' })); 
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
// Replace with your MongoDB Connection String
const dbLink = "mongodb+srv://ankitprogrammer25:a32x05sYvukG178G@cluster0.0dhqpzv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbLink)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// --- MODELS ---

const StudentSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    joinedAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', StudentSchema);

const MaterialSchema = new mongoose.Schema({
    title: String,
    link: String,
    type: String,
    accessCode: String,
    date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

const QuestionSchema = new mongoose.Schema({
    text: String,
    image: String, // Base64
    options: [String],
    correct: Number, // 0-3
    marks: Number,   // e.g., +2
    negative: Number // e.g., -0.66
});

const TestSchema = new mongoose.Schema({
    title: String,
    instructions: String,
    duration: Number, // Minutes
    accessCode: String,
    questions: [QuestionSchema],
    date: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', TestSchema);

const ResultSchema = new mongoose.Schema({
    studentName: String,
    testTitle: String,
    score: Number,
    totalMarks: Number,
    rank: Number,
    totalStudents: Number,
    date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

// --- ROUTES ---

// Auth
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if(await Student.findOne({ email })) return res.json({ success: false, message: "Email taken" });
        await new Student({ name, email, password }).save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student || student.password !== password) return res.json({ success: false });
    res.json({ success: true, name: student.name });
});

// Admin
app.post('/api/admin/create-test', async (req, res) => {
    await new Test(req.body).save();
    res.json({ success: true });
});
app.post('/api/admin/upload-material', async (req, res) => {
    await new Material(req.body).save();
    res.json({ success: true });
});
app.get('/api/admin/stats', async (req, res) => {
    const newStudents = await Student.find().sort({ joinedAt: -1 }).limit(5);
    res.json({ newStudents });
});

// Student
app.get('/api/materials', async (req, res) => {
    const files = await Material.find({}, 'title type date');
    res.json(files);
});
app.post('/api/material/unlock', async (req, res) => {
    const file = await Material.findById(req.body.id);
    if(file && file.accessCode === req.body.code) res.json({ success: true, link: file.link });
    else res.json({ success: false });
});

app.get('/api/tests', async (req, res) => {
    const tests = await Test.find({}, 'title duration date');
    res.json(tests);
});

app.post('/api/test/start', async (req, res) => {
    const test = await Test.findById(req.body.id);
    if(test && test.accessCode === req.body.code) {
        // Send questions WITHOUT correct answers
        const safeQuestions = test.questions.map(q => ({
            _id: q._id,
            text: q.text,
            image: q.image,
            options: q.options,
            marks: q.marks,
            negative: q.negative
        }));
        res.json({ 
            success: true, 
            questions: safeQuestions, 
            duration: test.duration, 
            title: test.title,
            instructions: test.instructions 
        });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/test/submit', async (req, res) => {
    const { testId, answers, studentName } = req.body;
    const test = await Test.findById(testId);
    
    let score = 0;
    let totalMarks = 0;

    test.questions.forEach((q, i) => {
        totalMarks += q.marks;
        if(answers[i] === q.correct) {
            score += q.marks;
        } else if (answers[i] !== null && answers[i] !== undefined) {
            score -= q.negative;
        }
    });

    // Save Result
    await new Result({ studentName, testTitle: test.title, score, totalMarks }).save();
    
    // Calculate Rank
    const betterStudents = await Result.countDocuments({ testTitle: test.title, score: { $gt: score } });
    const totalStudents = await Result.countDocuments({ testTitle: test.title });
    
    res.json({ score, totalMarks, rank: betterStudents + 1, totalStudents });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));