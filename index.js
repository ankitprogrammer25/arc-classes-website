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
    title: String, description: String, link: String, type: String, image: String, accessCode: String, date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

const QuestionSchema = new mongoose.Schema({
    text: String, image: String, options: [String], correct: Number, marks: Number, negative: Number, topic: String
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

// Updated Result to store Answers
const ResultSchema = new mongoose.Schema({
    studentName: String, studentEmail: String, testTitle: String, testId: String, 
    score: Number, totalMarks: Number, percentage: Number, rank: Number, feedback: String,
    answers: [Number], // Stores student choices
    date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

const BlogSchema = new mongoose.Schema({
    title: String, content: String, image: String, hColor: String, pColor: String, date: { type: Date, default: Date.now }
});
const Blog = mongoose.model('Blog', BlogSchema);

const ConfigSchema = new mongoose.Schema({ type: String, content: String });
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

// New: Get Full Test Details for Teacher Review
app.post('/api/admin/result-details', async (req, res) => {
    try {
        const result = await Result.findById(req.body.resultId);
        const test = await Test.findById(result.testId);
        res.json({ success: true, result, test });
    } catch(e) { res.json({ success: false }); }
});

// Admin Actions
app.post('/api/admin/material', async (req, res) => { await new Material(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/material/:id', async (req, res) => { await Material.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.post('/api/admin/test', async (req, res) => { await new Test(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/test/:id', async (req, res) => { await Test.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.post('/api/admin/offline-result', async (req, res) => { await new OfflineResult(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/result/online/:id', async (req, res) => { await Result.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.post('/api/admin/blog', async (req, res) => { await new Blog(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/blog/:id', async (req, res) => { await Blog.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.put('/api/admin/blog/:id', async (req, res) => { await Blog.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.post('/api/admin/announcement', async (req, res) => { await Config.findOneAndUpdate({ type: 'announcement' }, { type: 'announcement', content: req.body.text }, { upsert: true }); res.json({ success: true }); });

// Public Content
app.get('/api/announcement', async (req, res) => { const a = await Config.findOne({ type: 'announcement' }); res.json({ text: a ? a.content : "Welcome!" }); });
app.get('/api/blogs', async (req, res) => res.json(await Blog.find().sort({ date: -1 })));
app.get('/api/materials', async (req, res) => res.json(await Material.find({}, 'title description type image date')));
app.post('/api/material/unlock', async (req, res) => {
    const f = await Material.findById(req.body.id);
    if(f && f.accessCode === req.body.code) res.json({ success: true, link: f.link }); else res.json({ success: false });
});
app.get('/api/results/offline', async (req, res) => {
    const r = await OfflineResult.find();
    res.json(r.map(x => ({ _id: x._id, title: x.title, date: x.date, records: x.records.map(rec => ({ studentName: rec.studentName, marks: rec.marks, rank: rec.rank, _id: rec._id })) })));
});
app.post('/api/results/unlock-copy', async (req, res) => {
    const { resultId, recordId, password } = req.body; const r = await OfflineResult.findById(resultId); const rec = r.records.id(recordId);
    if(rec && rec.accessCode === password) res.json({ success: true, link: rec.copyLink }); else res.json({ success: false });
});

// Exam Engine
app.get('/api/tests', async (req, res) => res.json(await Test.find({}, 'title duration date')));
app.post('/api/test/start', async (req, res) => {
    const { id, code, studentEmail } = req.body; const s = await Student.findOne({ email: studentEmail });
    if(!s) return res.json({ success: false, message: "Login first." });
    const attempts = s.testAttempts.get(id) || 0; if (attempts >= 3) return res.json({ success: false, message: "Max 3 attempts used." });
    const t = await Test.findById(id);
    if(t && t.accessCode === code) {
        s.testAttempts.set(id, attempts + 1); await s.save();
        const safeQ = t.questions.map(q => ({ text: q.text, image: q.image, options: q.options, marks: q.marks, negative: q.negative }));
        res.json({ success: true, test: {...t._doc, questions: safeQ} });
    } else res.json({ success: false, message: "Wrong Password" });
});

app.post('/api/test/submit', async (req, res) => {
    try {
        const { testId, answers, studentName, studentEmail } = req.body; const t = await Test.findById(testId);
        let score = 0, total = 0, correct = 0, wrong = 0, skipped = 0;
        
        t.questions.forEach((q, i) => {
            total += q.marks;
            if (answers[i] === null || answers[i] === undefined) skipped++;
            else if (answers[i] === q.correct) { score += q.marks; correct++; }
            else { score -= q.negative; wrong++; }
        });
        const pct = total > 0 ? (score / total) * 100 : 0;
        let fb = pct < 40 ? "Focus on concepts and try again." : (pct < 80 ? "Good effort!" : "Outstanding performance!");
        
        const r = new Result({ studentName, studentEmail, testTitle: t.title, testId: t._id, score, totalMarks: total, percentage: pct, rank: 0, feedback: fb, answers });
        await r.save();
        const rank = (await Result.countDocuments({ testTitle: t.title, score: { $gt: score } })) + 1;
        r.rank = rank; await r.save();
        
        res.json({ success: true, score, totalMarks: total, rank, percentage: pct.toFixed(1), feedback: fb, stats: { correct, wrong, skipped } });
    } catch(e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));