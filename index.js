require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
// Increase limit for image uploads (50mb)
app.use(express.json({ limit: '50mb' })); 
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
const dbLink = "mongodb+srv://ankitprogrammer25:a32x05sYvukG178G@cluster0.0dhqpzv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(dbLink)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// --- DATA MODELS ---

// 1. Student
const StudentSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    joinedAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', StudentSchema);

// 2. Material (Notes with Password)
const MaterialSchema = new mongoose.Schema({
    title: String,
    link: String,
    type: String,
    accessCode: String, // The password to open this file
    date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

// 3. Test (Full Dynamic Test)
const QuestionSchema = new mongoose.Schema({
    text: String,
    image: String, // Base64 image
    options: [String],
    correct: Number
});

const TestSchema = new mongoose.Schema({
    title: String,
    duration: Number, // in minutes
    accessCode: String, // Password to start test
    questions: [QuestionSchema],
    date: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', TestSchema);

// 4. Result
const ResultSchema = new mongoose.Schema({
    studentName: String,
    testTitle: String,
    score: Number,
    total: Number,
    date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);


// --- API ROUTES ---

// A. AUTHENTICATION
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if(await Student.findOne({ email })) return res.json({ success: false, message: "Email taken" });
        await new Student({ name, email, password }).save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Error" }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student || student.password !== password) return res.json({ success: false });
    res.json({ success: true, name: student.name });
});

// B. TEACHER ADMIN ROUTES
app.get('/api/admin/stats', async (req, res) => {
    // Get last 5 students
    const newStudents = await Student.find().sort({ joinedAt: -1 }).limit(5);
    res.json({ newStudents });
});

app.post('/api/admin/upload-material', async (req, res) => {
    await new Material(req.body).save();
    res.json({ success: true });
});

app.post('/api/admin/create-test', async (req, res) => {
    await new Test(req.body).save();
    res.json({ success: true });
});

app.get('/api/admin/delete-test/:id', async (req, res) => {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// C. STUDENT CONTENT ROUTES

// Get List of Files (Hidden Links)
app.get('/api/materials', async (req, res) => {
    const files = await Material.find({}, 'title type date'); // Don't send link/code
    res.json(files);
});

// Unlock File
app.post('/api/material/unlock', async (req, res) => {
    const { id, code } = req.body;
    const file = await Material.findById(id);
    if(file && file.accessCode === code) res.json({ success: true, link: file.link });
    else res.json({ success: false });
});

// Get List of Tests (Hidden Questions)
app.get('/api/tests', async (req, res) => {
    const tests = await Test.find({}, 'title duration date'); 
    res.json(tests);
});

// Start Test (Unlock)
app.post('/api/test/start', async (req, res) => {
    const { id, code } = req.body;
    const test = await Test.findById(id);
    if(test && test.accessCode === code) {
        // Send questions but HIDE correct answer
        const safeQuestions = test.questions.map(q => ({
            text: q.text,
            image: q.image,
            options: q.options
        }));
        res.json({ success: true, questions: safeQuestions, duration: test.duration, title: test.title });
    } else {
        res.json({ success: false });
    }
});

// Submit Test
app.post('/api/test/submit', async (req, res) => {
    const { testId, answers, studentName } = req.body;
    const test = await Test.findById(testId);
    
    let score = 0;
    test.questions.forEach((q, i) => {
        if(answers[i] === q.correct) score += 4;
        else if(answers[i] !== null) score -= 1;
    });

    await new Result({ studentName, testTitle: test.title, score, total: test.questions.length * 4 }).save();
    res.json({ score, total: test.questions.length * 4 });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));