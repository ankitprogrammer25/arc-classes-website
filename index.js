require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' })); // Allows big images
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DB CONNECTION ---
const dbLink = "mongodb+srv://ankitprogrammer25:a32x05sYvukG178G@cluster0.0dhqpzv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(dbLink)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// --- MODELS ---
const StudentSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    joinedAt: { type: Date, default: Date.now },
    testAttempts: { type: Map, of: Number, default: {} }
});
const Student = mongoose.model('Student', StudentSchema);

const MaterialSchema = new mongoose.Schema({
    title: String, description: String, link: String, type: String, image: String, accessCode: String, date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

const QuestionSchema = new mongoose.Schema({
    text: String, image: String, options: [String], correct: Number, marks: Number, negative: Number
});

const TestSchema = new mongoose.Schema({
    title: String, instructions: String, duration: Number, accessCode: String, questions: [QuestionSchema], date: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', TestSchema);

const OfflineResultSchema = new mongoose.Schema({
    title: String, date: { type: Date, default: Date.now },
    records: [{ studentName: String, marks: Number, rank: Number, copyLink: String, accessCode: String }]
});
const OfflineResult = mongoose.model('OfflineResult', OfflineResultSchema);

const ResultSchema = new mongoose.Schema({
    studentName: String, studentEmail: String, testTitle: String, score: Number, totalMarks: Number, percentage: Number, rank: Number, feedback: String, date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

// New: Announcement Model
const ConfigSchema = new mongoose.Schema({ type: String, content: String });
const Config = mongoose.model('Config', ConfigSchema);

// --- ROUTES ---

// Auth
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
    res.json({ success: true, name: student.name, email: student.email });
});

// Admin Stats & Data
app.get('/api/admin/students', async (req, res) => res.json(await Student.find().sort({ joinedAt: -1 })));
app.get('/api/admin/results/online', async (req, res) => res.json(await Result.find().sort({ date: -1 })));

// Manage Content
app.post('/api/admin/material', async (req, res) => { await new Material(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/material/:id', async (req, res) => { await Material.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/admin/test', async (req, res) => { await new Test(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/test/:id', async (req, res) => { await Test.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/admin/offline-result', async (req, res) => { await new OfflineResult(req.body).save(); res.json({ success: true }); });

// Announcement
app.get('/api/announcement', async (req, res) => {
    const ann = await Config.findOne({ type: 'announcement' });
    res.json({ text: ann ? ann.content : "Welcome to ARC Classes!" });
});
app.post('/api/admin/announcement', async (req, res) => {
    await Config.findOneAndUpdate({ type: 'announcement' }, { type: 'announcement', content: req.body.text }, { upsert: true });
    res.json({ success: true });
});

// Student Access
app.get('/api/materials', async (req, res) => res.json(await Material.find({}, 'title description type image date')));
app.post('/api/material/unlock', async (req, res) => {
    const file = await Material.findById(req.body.id);
    if(file && file.accessCode === req.body.code) res.json({ success: true, link: file.link });
    else res.json({ success: false });
});

app.get('/api/results/offline', async (req, res) => {
    const results = await OfflineResult.find();
    // Hide codes and links
    res.json(results.map(r => ({ 
        _id: r._id, title: r.title, date: r.date, 
        records: r.records.map(rec => ({ studentName: rec.studentName, marks: rec.marks, rank: rec.rank, _id: rec._id })) 
    })));
});

app.post('/api/results/unlock-copy', async (req, res) => {
    const { resultId, recordId, password } = req.body;
    const result = await OfflineResult.findById(resultId);
    const record = result.records.id(recordId);
    if(record && record.accessCode === password) res.json({ success: true, link: record.copyLink });
    else res.json({ success: false });
});

// Exam Engine
app.get('/api/tests', async (req, res) => res.json(await Test.find({}, 'title duration date')));

app.post('/api/test/start', async (req, res) => {
    const { id, code, studentEmail } = req.body;
    const student = await Student.findOne({ email: studentEmail });
    if(!student) return res.json({ success: false, message: "Login first." });

    const attempts = student.testAttempts.get(id) || 0;
    if (attempts >= 3) return res.json({ success: false, message: "Max 3 attempts reached." });

    const test = await Test.findById(id);
    if(test && test.accessCode === code) {
        student.testAttempts.set(id, attempts + 1);
        await student.save();
        const safeQ = test.questions.map(q => ({ text: q.text, image: q.image, options: q.options, marks: q.marks, negative: q.negative }));
        res.json({ success: true, test: {...test._doc, questions: safeQ} });
    } else res.json({ success: false, message: "Wrong Password" });
});

app.post('/api/test/submit', async (req, res) => {
    const { testId, answers, studentName, studentEmail } = req.body;
    const test = await Test.findById(testId);
    let score = 0, total = 0;
    test.questions.forEach((q, i) => {
        total += q.marks;
        if(answers[i] === q.correct) score += q.marks;
        else if(answers[i] !== null) score -= q.negative;
    });

    const percentage = total > 0 ? (score / total) * 100 : 0;
    let feedback = percentage < 40 ? "Focus on concepts and try again." : (percentage < 80 ? "Good job! Keep revising." : "Outstanding performance!");
    
    await new Result({ studentName, studentEmail, testTitle: test.title, score, totalMarks: total, percentage, feedback }).save();
    const rank = (await Result.countDocuments({ testTitle: test.title, score: { $gt: score } })) + 1;
    res.json({ score, totalMarks: total, rank, percentage: percentage.toFixed(1), feedback });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));