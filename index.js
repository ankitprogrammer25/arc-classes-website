require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' })); 
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
const dbLink = "mongodb+srv://ankitprogrammer25:a32x05sYvukG178G@cluster0.0dhqpzv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(dbLink)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// --- MODELS ---

const StudentSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String, // Stored simply as requested for recovery
    joinedAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', StudentSchema);

const MaterialSchema = new mongoose.Schema({
    title: String,
    description: String,
    link: String,
    type: String, // 'Note' or 'Book'
    image: String, // Cover Image
    accessCode: String,
    date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

const TestSchema = new mongoose.Schema({
    title: String,
    instructions: String,
    duration: Number,
    accessCode: String,
    questions: Array,
    date: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', TestSchema);

// Offline Result (For Classroom Tests)
const OfflineResultSchema = new mongoose.Schema({
    title: String,
    date: { type: Date, default: Date.now },
    records: [{
        studentName: String,
        marks: Number,
        rank: Number,
        copyLink: String, // Drive link to checked copy
        accessCode: String // Password for that specific student
    }]
});
const OfflineResult = mongoose.model('OfflineResult', OfflineResultSchema);

// Online Test Result
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

// 1. AUTH & STUDENT MANAGEMENT
app.post('/api/register', async (req, res) => {
    try {
        const { name, emailPart, password } = req.body;
        const fullEmail = emailPart + "@arcstudent.com";
        
        if(await Student.findOne({ email: fullEmail })) return res.json({ success: false, message: "Username taken" });
        
        await new Student({ name, email: fullEmail, password }).save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Error" }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student || student.password !== password) return res.json({ success: false });
    res.json({ success: true, name: student.name });
});

app.get('/api/admin/students', async (req, res) => {
    // TEACHER ONLY: Returns passwords too
    const students = await Student.find().sort({ joinedAt: -1 });
    res.json(students);
});

// 2. MATERIALS (Notes/Books)
app.post('/api/admin/material', async (req, res) => {
    await new Material(req.body).save();
    res.json({ success: true });
});
app.delete('/api/admin/material/:id', async (req, res) => {
    await Material.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});
app.get('/api/materials', async (req, res) => {
    // Hide link and code from public
    const files = await Material.find({}, 'title description type image date');
    res.json(files);
});
app.post('/api/material/unlock', async (req, res) => {
    const file = await Material.findById(req.body.id);
    if(file && file.accessCode === req.body.code) res.json({ success: true, link: file.link });
    else res.json({ success: false });
});

// 3. TESTS
app.post('/api/admin/test', async (req, res) => {
    await new Test(req.body).save();
    res.json({ success: true });
});
app.delete('/api/admin/test/:id', async (req, res) => {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});
app.get('/api/tests', async (req, res) => {
    res.json(await Test.find({}, 'title duration date'));
});
app.post('/api/test/start', async (req, res) => {
    const test = await Test.findById(req.body.id);
    if(test && test.accessCode === req.body.code) {
        // Hide correct answers
        const safeQ = test.questions.map(q => ({...q, correct: undefined}));
        res.json({ success: true, test: {...test._doc, questions: safeQ} });
    } else res.json({ success: false });
});
app.post('/api/test/submit', async (req, res) => {
    const { testId, answers, studentName } = req.body;
    const test = await Test.findById(testId);
    let score = 0, total = 0;
    test.questions.forEach((q, i) => {
        total += q.marks;
        if(answers[i] === q.correct) score += q.marks;
        else if(answers[i] !== null) score -= q.negative;
    });
    await new Result({ studentName, testTitle: test.title, score, totalMarks: total }).save();
    const rank = (await Result.countDocuments({ testTitle: test.title, score: { $gt: score } })) + 1;
    res.json({ score, totalMarks: total, rank });
});

// 4. RESULTS (OFFLINE & ONLINE)
app.post('/api/admin/offline-result', async (req, res) => {
    await new OfflineResult(req.body).save();
    res.json({ success: true });
});
app.get('/api/results/offline', async (req, res) => {
    // Send basic data (Marks/Rank) but HIDE Links and Passwords
    const results = await OfflineResult.find();
    const safeResults = results.map(r => ({
        _id: r._id,
        title: r.title,
        date: r.date,
        records: r.records.map(rec => ({
            studentName: rec.studentName,
            marks: rec.marks,
            rank: rec.rank,
            _id: rec._id // Needed to unlock specific copy
        }))
    }));
    res.json(safeResults);
});
app.post('/api/results/unlock-copy', async (req, res) => {
    const { resultId, recordId, password } = req.body;
    const result = await OfflineResult.findById(resultId);
    const record = result.records.id(recordId);
    
    if(record && record.accessCode === password) {
        res.json({ success: true, link: record.copyLink });
    } else {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));