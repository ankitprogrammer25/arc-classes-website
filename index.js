require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. DATABASE CONNECTION ---
const dbLink = "mongodb+srv://ankitprogrammer25:a32x05sYvukG178G@cluster0.0dhqpzv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbLink)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ DB Connection Error:', err.message));

// --- 2. SCHEMAS ---
const StudentSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String, joinedAt: { type: Date, default: Date.now },
});
const Student = mongoose.model('Student', StudentSchema);

const MaterialSchema = new mongoose.Schema({
    title: String, description: String, link: String, category: String, 
    image: String, accessCode: String, date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

const QuestionSchema = new mongoose.Schema({
    text: String, image: String, options: [String], correct: Number, 
    marks: Number, negative: Number, topic: String, solution: String 
});

const TestSchema = new mongoose.Schema({
    title: String, instructions: String, duration: Number, accessCode: String, category: String,
    isLive: Boolean, startTime: Date, endTime: Date,
    questions: [QuestionSchema], date: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', TestSchema);

const OfflineResultSchema = new mongoose.Schema({
    title: String, date: { type: Date, default: Date.now },
    records: [{ studentName: String, marks: Number, rank: Number, copyLink: String }]
});
const OfflineResult = mongoose.model('OfflineResult', OfflineResultSchema);

const ResultSchema = new mongoose.Schema({
    studentName: String, studentEmail: String, testTitle: String, testId: String, testType: String,
    score: Number, totalMarks: Number, percentage: Number, rank: Number, feedback: String,
    answers: [Number], timeTaken: [Number], date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

const BlogSchema = new mongoose.Schema({
    title: String, content: String, image: String, date: { type: Date, default: Date.now }
});
const Blog = mongoose.model('Blog', BlogSchema);

const ConfigSchema = new mongoose.Schema({ type: String, list: [String] });
const Config = mongoose.model('Config', ConfigSchema);

// --- 3. ROUTES ---

// --- AUTH ---
app.post('/api/register', async (req, res) => {
    try {
        const { name, emailPart, password } = req.body; 
        const fullEmail = emailPart + "@arcstudent.com";
        if(await Student.findOne({ email: fullEmail })) return res.json({ success: false, message: "Username Taken" });
        await new Student({ name, email: fullEmail, password }).save(); 
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Error" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body; 
        // 🚨 HARDCODED TEACHER LOGIN
        if (email === 'admin@arc.com' && password === 'admin123') {
            return res.json({ success: true, name: "ARC Admin", email: "admin@arc.com", role: 'admin' });
        }
        const student = await Student.findOne({ email });
        if (!student || student.password !== password) return res.json({ success: false });
        res.json({ success: true, name: student.name, email: student.email, role: 'student' });
    } catch (e) { res.json({ success: false }); }
});

// --- ADMIN API ---
app.get('/api/admin/students', async (req, res) => res.json(await Student.find().sort({ joinedAt: -1 })));
app.get('/api/admin/results/online', async (req, res) => res.json(await Result.find().sort({ date: -1 })));

app.post('/api/admin/material', async (req, res) => { await new Material(req.body).save(); res.json({ success: true }); });
app.post('/api/admin/test', async (req, res) => { await new Test(req.body).save(); res.json({ success: true }); });
app.post('/api/admin/blog', async (req, res) => { await new Blog(req.body).save(); res.json({ success: true }); });
app.post('/api/admin/offline-result', async (req, res) => { await new OfflineResult(req.body).save(); res.json({ success: true }); });

// ANNOUNCEMENTS
app.get('/api/announcement', async (req, res) => { 
    const c = await Config.findOne({ type: 'announce_list' });
    res.json({ list: c ? c.list : ["Welcome to ARC Classes"] });
});
app.post('/api/admin/announcement/add', async (req, res) => {
    await Config.findOneAndUpdate({ type: 'announce_list' }, { $push: { list: req.body.text } }, { upsert: true });
    res.json({ success: true });
});
app.post('/api/admin/announcement/delete', async (req, res) => {
    const c = await Config.findOne({ type: 'announce_list' });
    if(c) { c.list = c.list.filter(t => t !== req.body.text); await c.save(); }
    res.json({ success: true });
});

// --- STUDENT API ---
app.get('/api/materials', async (req, res) => res.json(await Material.find()));
app.get('/api/tests', async (req, res) => res.json(await Test.find({}, 'title duration category date accessCode isLive startTime endTime')));
app.get('/api/blogs', async (req, res) => res.json(await Blog.find().sort({ date: -1 })));
app.post('/api/student/results/online', async (req, res) => res.json({ success: true, results: await Result.find({ studentEmail: req.body.email }).sort({ date: -1 }) }));
app.get('/api/results/offline', async (req, res) => res.json(await OfflineResult.find()));

// CORE RESULT DETAILS (For both Student & Admin)
app.post('/api/result-details', async (req, res) => {
    try {
        const result = await Result.findById(req.body.resultId);
        if(!result) return res.json({ success: false, message: "Result Not Found" });
        const rank = (await Result.countDocuments({ testId: result.testId, score: { $gt: result.score } })) + 1;
        const test = await Test.findById(result.testId);
        if(!test) return res.json({ success: true, result, rank, questions: [], message: "Test was deleted by teacher." });
        
        const detailedQuestions = test.questions.map((q, i) => ({
            text: q.text, image: q.image, options: q.options, correct: q.correct, solution: q.solution,
            studentAnswer: result.answers[i], timeSpent: result.timeTaken ? result.timeTaken[i] : 0,
            status: result.answers[i] === q.correct ? 'Correct' : (result.answers[i] === null ? 'Skipped' : 'Wrong')
        }));
        res.json({ success: true, result, rank, questions: detailedQuestions });
    } catch(e) { res.json({ success: false, message: e.message }); }
});

app.post('/api/material/unlock', async (req, res) => {
    const f = await Material.findById(req.body.id);
    if(f && (!f.accessCode || f.accessCode === req.body.code)) res.json({ success: true, link: f.link }); else res.json({ success: false });
});

app.post('/api/test/start', async (req, res) => {
    const { id, code, studentEmail } = req.body; 
    
    // Admin bypass for previews
    if (studentEmail !== 'admin@arc.com') {
        const s = await Student.findOne({ email: studentEmail });
        if(!s) return res.json({ success: false, message: "Login first" });
    }

    const t = await Test.findById(id);
    if(t.isLive && studentEmail !== 'admin@arc.com') {
        const now = new Date();
        if(now < new Date(t.startTime)) return res.json({ success: false, message: "Not Started" });
        if(now > new Date(t.endTime)) return res.json({ success: false, message: "Expired" });
    }
    if(!t.accessCode || t.accessCode === code) {
        const safeQ = t.questions.map(q => ({ text: q.text, image: q.image, options: q.options, marks: q.marks, negative: q.negative }));
        res.json({ success: true, test: {...t._doc, questions: safeQ} });
    } else res.json({ success: false, message: "Wrong Password" });
});

app.post('/api/test/submit', async (req, res) => {
    try {
        const { testId, answers, timeTaken, studentName, studentEmail } = req.body; 
        const t = await Test.findById(testId);
        let score = 0, total = 0;
        t.questions.forEach((q, i) => {
            total += q.marks;
            if (answers[i] === q.correct) score += q.marks;
            else if (answers[i] !== null) score -= q.negative;
        });
        const pct = (score / total) * 100;
        const r = new Result({ 
            studentName, studentEmail, testTitle: t.title, testId: t._id, testType: t.isLive ? 'live' : 'practice', 
            score, totalMarks: total, percentage: pct, rank: 0, feedback: pct>80?"Excellent":"Keep Improving", 
            answers, timeTaken 
        });
        await r.save();
        res.json({ success: true, score });
    } catch(e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));