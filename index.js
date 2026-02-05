require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DB CONNECTION ---
const dbLink = "mongodb+srv://ankitprogrammer25:a32x05sYvukG178G@cluster0.0dhqpzv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(dbLink)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// --- MODELS ---
const StudentSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String, joinedAt: { type: Date, default: Date.now },
    testAttempts: { type: Map, of: Number, default: {} }
});
const Student = mongoose.model('Student', StudentSchema);

const MaterialSchema = new mongoose.Schema({
    title: String, description: String, link: String, type: String, category: String,
    image: String, accessCode: String, date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

const QuestionSchema = new mongoose.Schema({
    text: String, image: String, options: [String], correct: Number, marks: Number, negative: Number, topic: String
});

const TestSchema = new mongoose.Schema({
    title: String, instructions: String, duration: Number, accessCode: String, category: String,
    isLive: Boolean, startTime: Date, endTime: Date, // NEW: Live Test Fields
    questions: [QuestionSchema], date: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', TestSchema);

const OfflineResultSchema = new mongoose.Schema({
    title: String, date: { type: Date, default: Date.now },
    records: [{ studentName: String, marks: Number, rank: Number, copyLink: String, accessCode: String }]
});
const OfflineResult = mongoose.model('OfflineResult', OfflineResultSchema);

const ResultSchema = new mongoose.Schema({
    studentName: String, studentEmail: String, testTitle: String, testId: String, testType: String, // 'practice' or 'live'
    score: Number, totalMarks: Number, percentage: Number, rank: Number, feedback: String,
    answers: [Number], topicAnalytics: Object, date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

const BlogSchema = new mongoose.Schema({
    title: String, content: String, image: String, date: { type: Date, default: Date.now }
});
const Blog = mongoose.model('Blog', BlogSchema);

const ConfigSchema = new mongoose.Schema({ type: String, list: [String] });
const Config = mongoose.model('Config', ConfigSchema);

// --- ROUTES ---

// Auth
app.post('/api/register', async (req, res) => {
    try {
        const { name, emailPart, password } = req.body; const fullEmail = emailPart + "@arcstudent.com";
        if(await Student.findOne({ email: fullEmail })) return res.json({ success: false, message: "Taken" });
        await new Student({ name, email: fullEmail, password }).save(); res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body; const student = await Student.findOne({ email });
    if (!student || student.password !== password) return res.json({ success: false });
    res.json({ success: true, name: student.name, email: student.email });
});

// Admin Data
app.get('/api/admin/students', async (req, res) => res.json(await Student.find().sort({ joinedAt: -1 })));
app.get('/api/admin/results/online', async (req, res) => res.json(await Result.find().sort({ date: -1 })));

// Result Details (For Review)
app.post('/api/result-details', async (req, res) => {
    try {
        const result = await Result.findById(req.body.resultId);
        const test = await Test.findById(result.testId);
        res.json({ success: true, result, test });
    } catch(e) { res.json({ success: false }); }
});

// Admin Actions
app.post('/api/admin/material', async (req, res) => { await new Material(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/material/:id', async (req, res) => { await Material.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// Test Management
app.post('/api/admin/test', async (req, res) => { await new Test(req.body).save(); res.json({ success: true }); });
app.put('/api/admin/test/:id', async (req, res) => { await Test.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.delete('/api/admin/test/:id', async (req, res) => { await Test.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get('/api/admin/test/:id', async (req, res) => { res.json(await Test.findById(req.params.id)); });

app.post('/api/admin/offline-result', async (req, res) => { await new OfflineResult(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/offline-result/:id', async (req, res) => { await OfflineResult.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.delete('/api/admin/result/online/:id', async (req, res) => { await Result.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/admin/blog', async (req, res) => { await new Blog(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/blog/:id', async (req, res) => { await Blog.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.put('/api/admin/blog/:id', async (req, res) => { await Blog.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });

// Announcement
app.get('/api/announcement', async (req, res) => { 
    const c = await Config.findOne({ type: 'announce_list' });
    res.json({ list: c ? c.list : ["Welcome to ARC Classes!"] });
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

// Student Access
app.get('/api/materials', async (req, res) => res.json(await Material.find({}, 'title description category type image accessCode date')));
app.post('/api/material/unlock', async (req, res) => {
    const f = await Material.findById(req.body.id);
    if(f && f.accessCode === req.body.code) res.json({ success: true, link: f.link }); else res.json({ success: false });
});
app.get('/api/results/offline', async (req, res) => {
    const r = await OfflineResult.find();
    res.json(r.map(x => ({ _id: x._id, title: x.title, date: x.date, records: x.records.map(rec => ({ studentName: rec.studentName, marks: rec.marks, rank: rec.rank, _id: rec._id })) })));
});
// Get Student's Online History (Split by Type)
app.post('/api/student/results/online', async (req, res) => {
    try {
        const results = await Result.find({ studentEmail: req.body.email }).sort({ date: -1 });
        res.json({ success: true, results });
    } catch(e) { res.json({ success: false }); }
});

app.post('/api/results/unlock-copy', async (req, res) => {
    const { resultId, recordId, password } = req.body; const r = await OfflineResult.findById(resultId); const rec = r.records.id(recordId);
    if(rec && rec.accessCode === password) res.json({ success: true, link: rec.copyLink }); else res.json({ success: false });
});
app.get('/api/blogs', async (req, res) => res.json(await Blog.find().sort({ date: -1 })));

// Exam Engine (Public Info)
app.get('/api/tests', async (req, res) => res.json(await Test.find({}, 'title duration category date accessCode isLive startTime endTime')));

app.post('/api/test/start', async (req, res) => {
    const { id, code, studentEmail } = req.body; const s = await Student.findOne({ email: studentEmail });
    if(!s) return res.json({ success: false, message: "Login first." });
    
    const t = await Test.findById(id);
    
    // LIVE TEST CHECK
    if(t.isLive) {
        const now = new Date();
        if(now < new Date(t.startTime)) return res.json({ success: false, message: "Test has not started yet." });
        if(now > new Date(t.endTime)) return res.json({ success: false, message: "Test has expired." });
    } else {
        // Standard Attempt Limit for Practice Tests
        const attempts = s.testAttempts.get(id) || 0; 
        if (attempts >= 3) return res.json({ success: false, message: "Max 3 attempts used." });
    }

    if(!t.accessCode || t.accessCode === code) {
        if(!t.isLive) { s.testAttempts.set(id, (s.testAttempts.get(id)||0) + 1); await s.save(); }
        const safeQ = t.questions.map(q => ({ text: q.text, image: q.image, options: q.options, marks: q.marks, negative: q.negative }));
        res.json({ success: true, test: {...t._doc, questions: safeQ} });
    } else res.json({ success: false, message: "Wrong Password" });
});

app.post('/api/test/submit', async (req, res) => {
    try {
        const { testId, answers, studentName, studentEmail } = req.body; const t = await Test.findById(testId);
        let score = 0, total = 0, correct = 0, wrong = 0, skipped = 0, topicStats = {};
        t.questions.forEach((q, i) => {
            const topic = q.topic || "General";
            if(!topicStats[topic]) topicStats[topic] = { total: 0, obtained: 0 };
            topicStats[topic].total += q.marks; total += q.marks;
            if (answers[i] === q.correct) { score += q.marks; topicStats[topic].obtained += q.marks; correct++; }
            else if (answers[i] !== null && answers[i] !== undefined) { score -= q.negative; topicStats[topic].obtained -= q.negative; wrong++; }
            else skipped++;
        });
        let topicAnalytics = {};
        for(let topic in topicStats) { topicAnalytics[topic] = ((topicStats[topic].obtained / topicStats[topic].total) * 100).toFixed(1) + "%"; }
        const pct = total > 0 ? (score / total) * 100 : 0;
        let fb = pct < 40 ? "Focus on concepts." : (pct < 80 ? "Good effort!" : "Outstanding!");
        
        // Mark as 'live' or 'practice'
        const type = t.isLive ? 'live' : 'practice';

        const r = new Result({ studentName, studentEmail, testTitle: t.title, testId: t._id, testType: type, score, totalMarks: total, percentage: pct, rank: 0, feedback: fb, answers, topicAnalytics });
        await r.save();
        const rank = (await Result.countDocuments({ testTitle: t.title, score: { $gt: score } })) + 1;
        r.rank = rank; await r.save();
        res.json({ success: true, score, totalMarks: total, rank, percentage: pct.toFixed(1), feedback: fb, stats: { correct, wrong, skipped }, resultId: r._id });
    } catch(e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));