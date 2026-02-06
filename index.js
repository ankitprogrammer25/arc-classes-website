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
// ⚠️ NOTE: If testing on a restricted WiFi (College/Office), use: "mongodb://127.0.0.1:27017/arc_classes"
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
    title: String, description: String, link: String, category: String, // "11th", "Organic", etc.
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
    answers: [Number], // Index of option selected
    timeTaken: [Number], // Seconds per question
    date: { type: Date, default: Date.now }
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
        const student = await Student.findOne({ email });
        if (!student || student.password !== password) return res.json({ success: false });
        res.json({ success: true, name: student.name, email: student.email });
    } catch (e) { res.json({ success: false }); }
});

// --- ADMIN & DATA ---
app.get('/api/admin/students', async (req, res) => res.json(await Student.find().sort({ joinedAt: -1 })));
app.get('/api/admin/results/online', async (req, res) => res.json(await Result.find().sort({ date: -1 })));

// --- CORE: VIEW ANSWER SHEET ---
app.post('/api/result-details', async (req, res) => {
    try {
        const result = await Result.findById(req.body.resultId);
        if(!result) return res.json({ success: false, message: "Result Not Found" });

        // Dynamic Rank: Count how many people scored HIGHER than this student in THIS test
        const rank = (await Result.countDocuments({ testId: result.testId, score: { $gt: result.score } })) + 1;
        
        const test = await Test.findById(result.testId);
        
        // If test is deleted, we return what we can
        if(!test) return res.json({ success: true, result, rank, questions: [], message: "Test was deleted by teacher." });

        // Merge Data for Frontend
        const detailedQuestions = test.questions.map((q, i) => ({
            text: q.text,
            image: q.image,
            options: q.options,
            correct: q.correct,
            solution: q.solution,
            studentAnswer: result.answers[i],
            timeSpent: result.timeTaken ? result.timeTaken[i] : 0,
            status: result.answers[i] === q.correct ? 'Correct' : (result.answers[i] === null ? 'Skipped' : 'Wrong')
        }));

        res.json({ success: true, result, rank, questions: detailedQuestions });
    } catch(e) { res.json({ success: false, message: e.message }); }
});

// --- CONTENT MANAGEMENT ---
app.post('/api/admin/material', async (req, res) => { await new Material(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/material/:id', async (req, res) => { await Material.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/admin/test', async (req, res) => { await new Test(req.body).save(); res.json({ success: true }); });
app.put('/api/admin/test/:id', async (req, res) => { await Test.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.delete('/api/admin/test/:id', async (req, res) => { await Test.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get('/api/admin/test/:id', async (req, res) => { res.json(await Test.findById(req.params.id)); });

app.post('/api/admin/offline-result', async (req, res) => { await new OfflineResult(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/offline-result/:id', async (req, res) => { await OfflineResult.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/admin/blog', async (req, res) => { await new Blog(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/blog/:id', async (req, res) => { await Blog.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// --- ANNOUNCEMENTS ---
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

// --- STUDENT FETCH ---
app.get('/api/materials', async (req, res) => res.json(await Material.find()));
app.post('/api/material/unlock', async (req, res) => {
    const f = await Material.findById(req.body.id);
    if(f && (!f.accessCode || f.accessCode === req.body.code)) res.json({ success: true, link: f.link }); else res.json({ success: false });
});
app.get('/api/results/offline', async (req, res) => res.json(await OfflineResult.find()));
app.post('/api/student/results/online', async (req, res) => res.json({ success: true, results: await Result.find({ studentEmail: req.body.email }).sort({ date: -1 }) }));
app.get('/api/blogs', async (req, res) => res.json(await Blog.find().sort({ date: -1 })));

// --- EXAM ENGINE ---
app.get('/api/tests', async (req, res) => res.json(await Test.find({}, 'title duration category date accessCode isLive startTime endTime')));

app.post('/api/test/start', async (req, res) => {
    const { id, code, studentEmail } = req.body; 
    const s = await Student.findOne({ email: studentEmail });
    if(!s) return res.json({ success: false, message: "Login first" });

    const t = await Test.findById(id);
    
    // Live Test Logic
    if(t.isLive) {
        const now = new Date();
        if(now < new Date(t.startTime)) return res.json({ success: false, message: `Starts: ${new Date(t.startTime).toLocaleString()}` });
        if(now > new Date(t.endTime)) return res.json({ success: false, message: "Expired" });
    }

    if(!t.accessCode || t.accessCode === code) {
        // Send questions hidden (no correct answers)
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
        const type = t.isLive ? 'live' : 'practice';
        
        const r = new Result({ 
            studentName, studentEmail, testTitle: t.title, testId: t._id, testType: type, 
            score, totalMarks: total, percentage: pct, rank: 0, feedback: pct>80?"Excellent":"Keep Improving", 
            answers, timeTaken // Saving Time Taken Array
        });
        await r.save();
        
        const rank = (await Result.countDocuments({ testId: t._id, score: { $gt: score } })) + 1;
        r.rank = rank; await r.save();
        
        res.json({ success: true, resultId: r._id });
    } catch(e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));