require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

// --- 0. GLOBAL ERROR CATCHERS ---
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. DATABASE CONNECTION ---
const dbLink = "mongodb+srv://ankitprogrammer25:a32x05sYvukG178G@cluster0.0dhqpzv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(dbLink, { 
    serverSelectionTimeoutMS: 5000, 
    socketTimeoutMS: 45000 
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ DB Connection Error:', err.message));

// --- 2. SCHEMAS ---
const StudentSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String, 
    phone: String, status: { type: String, default: 'Pending' }, joinedAt: { type: Date, default: Date.now },
});
const Student = mongoose.model('Student', StudentSchema);

const MaterialSchema = new mongoose.Schema({
    title: String, description: String, link: String, category: String, 
    image: String, accessCode: String, date: { type: Date, default: Date.now }
});
const Material = mongoose.model('Material', MaterialSchema);

const QuestionSchema = new mongoose.Schema({
    text: String, image: String, options: [String], correct: Number, 
    marks: Number, negative: Number, topic: String, solution: String,
    solutionImage: String 
});

const TestSchema = new mongoose.Schema({
    title: String, instructions: String, duration: Number, accessCode: String, category: String,
    isLive: Boolean, startTime: Date, endTime: Date,
    questions: [QuestionSchema], date: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', TestSchema);

const ScheduleSchema = new mongoose.Schema({
    cls: String, topic: String, password: String, time: Date
});
const Schedule = mongoose.model('Schedule', ScheduleSchema);

const OfflineResultSchema = new mongoose.Schema({
    title: String, date: { type: Date, default: Date.now },
    records: [{ studentName: String, totalMarks: Number, obtainedMarks: Number, rank: Number, copyLink: String }]
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

const SuccessStorySchema = new mongoose.Schema({
    name: String, status: String, experience: String, image: String, date: { type: Date, default: Date.now }
});
const SuccessStory = mongoose.model('SuccessStory', SuccessStorySchema);

const ConfigSchema = new mongoose.Schema({ type: String, list: [String] });
const Config = mongoose.model('Config', ConfigSchema);

const DoubtSchema = new mongoose.Schema({
    studentEmail: String, studentName: String, text: String, image: String, 
    replyText: String, replyImage: String, status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
});
const Doubt = mongoose.model('Doubt', DoubtSchema);

const VideoSchema = new mongoose.Schema({
    title: String, link: String, category: String, date: { type: Date, default: Date.now }
});
const Video = mongoose.model('Video', VideoSchema);

const POTDSchema = new mongoose.Schema({
    dateStr: String, text: String, image: String, options: [String], correct: Number, solution: String, solutionImage: String
});
const POTD = mongoose.model('POTD', POTDSchema);

const RefToolSchema = new mongoose.Schema({
    title: String, image: String, date: { type: Date, default: Date.now }
});
const RefTool = mongoose.model('RefTool', RefToolSchema);

// --- 3. ROUTES ---
app.post('/api/register', async (req, res) => {
    try {
        const { name, emailPart, password, phone } = req.body; 
        const fullEmail = emailPart + "@arcstudent.com";
        if(await Student.findOne({ email: fullEmail })) return res.json({ success: false, message: "Username Taken" });
        await new Student({ name, email: fullEmail, password, phone, status: 'Pending' }).save(); 
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Error" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body; 
        if (email === 'admin@arc.com' && password === 'admin123') {
            return res.json({ success: true, name: "ARC Admin", email: "admin@arc.com", role: 'admin' });
        }
        const student = await Student.findOne({ email });
        if (!student || student.password !== password) return res.json({ success: false, message: "Invalid Email or Password" });
        
        if (student.status === 'Pending') {
            return res.json({ success: false, message: "Your registration is under review." });
        }
        res.json({ success: true, name: student.name, email: student.email, role: 'student' });
    } catch (e) { res.json({ success: false, message: "Server Error" }); }
});

// ADMIN API
app.get('/api/admin/students', async (req, res) => res.json(await Student.find().sort({ joinedAt: -1 })));
app.get('/api/admin/student/:id', async (req, res) => res.json(await Student.findById(req.params.id)));
app.put('/api/admin/student/:id', async (req, res) => { await Student.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.delete('/api/admin/student/:id', async (req, res) => { await Student.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/admin/results/online', async (req, res) => res.json(await Result.find().sort({ date: -1 })));
app.delete('/api/admin/result/:id', async (req, res) => { await Result.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/admin/material', async (req, res) => { await new Material(req.body).save(); res.json({ success: true }); });
app.put('/api/admin/material/:id', async (req, res) => { await Material.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.delete('/api/admin/material/:id', async (req, res) => { await Material.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/admin/test/:id', async (req, res) => { res.json(await Test.findById(req.params.id)); });
app.post('/api/admin/test', async (req, res) => { await new Test(req.body).save(); res.json({ success: true }); });
app.put('/api/admin/test/:id', async (req, res) => { await Test.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.delete('/api/admin/test/:id', async (req, res) => { await Test.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/admin/blog', async (req, res) => { await new Blog(req.body).save(); res.json({ success: true }); });
app.put('/api/admin/blog/:id', async (req, res) => { await Blog.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.delete('/api/admin/blog/:id', async (req, res) => { await Blog.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/schedule', async (req, res) => {
    try { res.json(await Schedule.find().sort({ time: 1 })); } catch(e) { res.json([]); }
});
app.post('/api/admin/schedule', async (req, res) => { await new Schedule(req.body).save(); res.json({ success: true }); });
app.put('/api/admin/schedule/:id', async (req, res) => { await Schedule.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.delete('/api/admin/schedule/:id', async (req, res) => { await Schedule.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/stories', async (req, res) => {
    try { res.json(await SuccessStory.find().sort({ date: -1 })); } catch(e) { res.json([]); }
});
app.post('/api/story', async (req, res) => { try { await new SuccessStory(req.body).save(); res.json({ success: true }); } catch(e) { res.json({ success: false }); } });
app.delete('/api/admin/story/:id', async (req, res) => { await SuccessStory.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/admin/offline-result/:id', async (req, res) => { res.json(await OfflineResult.findById(req.params.id)); });
app.post('/api/admin/offline-result', async (req, res) => { 
    try {
        const { title, records } = req.body;
        records.sort((a, b) => b.obtainedMarks - a.obtainedMarks);
        records.forEach((rec, index) => { rec.rank = index + 1; });
        await new OfflineResult({ title, records }).save(); 
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});
app.put('/api/admin/offline-result/:id', async (req, res) => { 
    try {
        const { title, records } = req.body;
        records.sort((a, b) => b.obtainedMarks - a.obtainedMarks);
        records.forEach((rec, index) => { rec.rank = index + 1; });
        await OfflineResult.findByIdAndUpdate(req.params.id, { title, records }); 
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});
app.delete('/api/admin/offline-result/:id', async (req, res) => { await OfflineResult.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// NEW LOGO SETTINGS ROUTES
app.get('/api/logo', async (req, res) => { 
    try {
        const c = await Config.findOne({ type: 'site_logo' });
        res.json({ success: true, logo: c && c.list.length > 0 ? c.list[0] : "" });
    } catch(e) { res.json({ success: false }); }
});
app.post('/api/admin/logo', async (req, res) => {
    try {
        await Config.findOneAndUpdate({ type: 'site_logo' }, { list: [req.body.logoBase64] }, { upsert: true });
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});

app.get('/api/announcement', async (req, res) => { 
    try {
        const c = await Config.findOne({ type: 'announce_list' });
        res.json({ list: c ? c.list : ["Welcome to ARC Classes"] });
    } catch(e) { res.json({ list: ["Welcome to ARC Classes"] }); }
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

app.get('/api/admin/doubts', async (req, res) => res.json(await Doubt.find().sort({ date: -1 })));
app.put('/api/admin/doubt/:id', async (req, res) => { 
    await Doubt.findByIdAndUpdate(req.params.id, { replyText: req.body.replyText, replyImage: req.body.replyImage, status: 'Answered' }); 
    res.json({ success: true }); 
});
app.delete('/api/admin/doubt/:id', async (req, res) => { await Doubt.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/admin/video', async (req, res) => { await new Video(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/video/:id', async (req, res) => { await Video.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/admin/potds', async (req, res) => res.json(await POTD.find().sort({ dateStr: -1 })));
app.post('/api/admin/potd', async (req, res) => {
    const { dateStr } = req.body;
    await POTD.findOneAndUpdate({ dateStr }, req.body, { upsert: true });
    res.json({ success: true });
});
app.delete('/api/admin/potd/:id', async (req, res) => {
    await POTD.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.get('/api/reftools', async (req, res) => {
    try { res.json(await RefTool.find().sort({ date: 1 })); } catch(e) { res.json([]); }
});
app.post('/api/admin/reftool', async (req, res) => { await new RefTool(req.body).save(); res.json({ success: true }); });
app.delete('/api/admin/reftool/:id', async (req, res) => { await RefTool.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// STUDENT API
app.get('/api/materials', async (req, res) => {
    try { res.json(await Material.find()); } catch(e) { res.json([]); }
});
app.get('/api/tests', async (req, res) => {
    try {
        const tests = await Test.find({}, 'title duration category date accessCode isLive startTime endTime');
        res.json(tests);
    } catch(e) { res.json([]); }
});
app.get('/api/blogs', async (req, res) => {
    try { res.json(await Blog.find().sort({ date: -1 })); } catch(e) { res.json([]); }
});
app.post('/api/student/results/online', async (req, res) => res.json({ success: true, results: await Result.find({ studentEmail: req.body.email }).sort({ date: -1 }) }));
app.get('/api/results/offline', async (req, res) => {
    try { res.json(await OfflineResult.find()); } catch(e) { res.json([]); }
});

app.post('/api/material/unlock', async (req, res) => {
    const f = await Material.findById(req.body.id);
    if(f && (!f.accessCode || f.accessCode === req.body.code)) res.json({ success: true, link: f.link }); else res.json({ success: false });
});

app.post('/api/result-details', async (req, res) => {
    try {
        const result = await Result.findById(req.body.resultId);
        if(!result) return res.json({ success: false, message: "Result Not Found" });
        
        const allResults = await Result.find({ testId: result.testId }).sort({ score: -1 });
        const rank = allResults.findIndex(r => r._id.toString() === result._id.toString()) + 1;

        const leaderboard = allResults.map((r, i) => ({ rank: i + 1, name: r.studentName, score: r.score, total: r.totalMarks }));

        const test = await Test.findById(result.testId);
        if(!test) return res.json({ success: true, result, rank, leaderboard, questions: [], message: "Test was deleted by teacher." });
        
        const detailedQuestions = test.questions.map((q, i) => ({
            text: q.text, image: q.image, options: q.options, correct: q.correct, 
            solution: q.solution, solutionImage: q.solutionImage,
            studentAnswer: result.answers[i], timeSpent: result.timeTaken ? result.timeTaken[i] : 0,
            status: result.answers[i] === q.correct ? 'Correct' : (result.answers[i] === null ? 'Skipped' : 'Wrong')
        }));
        
        res.json({ success: true, result, rank, leaderboard, questions: detailedQuestions });
    } catch(e) { res.json({ success: false, message: e.message }); }
});

app.post('/api/test/start', async (req, res) => {
    const { id, code, studentEmail } = req.body; 
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
    if(!t.accessCode || t.accessCode === "" || t.accessCode === code) {
        const safeQ = t.questions.map(q => ({ text: q.text, image: q.image, options: q.options, marks: q.marks || 4, negative: q.negative !== undefined ? q.negative : 0 }));
        res.json({ success: true, test: {...t._doc, questions: safeQ} });
    } else res.json({ success: false, message: "Wrong Password" });
});

app.post('/api/test/submit', async (req, res) => {
    try {
        const { testId, answers, timeTaken, studentName, studentEmail } = req.body; 
        const t = await Test.findById(testId);
        let score = 0, total = 0;
        t.questions.forEach((q, i) => {
            const marks = q.marks || 4;
            const neg = q.negative !== undefined ? q.negative : 0;
            total += marks;
            if (answers[i] === q.correct) score += marks;
            else if (answers[i] !== null && answers[i] !== -1) score -= neg; 
        });
        
        const pct = (score / total) * 100;
        const r = new Result({ 
            studentName, studentEmail, testTitle: t.title, testId: t._id, testType: t.isLive ? 'live' : 'practice', 
            score, totalMarks: total, percentage: pct, rank: 0, feedback: pct>80?"Excellent":"Keep Improving", 
            answers, timeTaken 
        });
        await r.save();
        res.json({ success: true, score, resultId: r._id });
    } catch(e) { res.json({ success: false }); }
});

app.post('/api/doubt', async (req, res) => { await new Doubt(req.body).save(); res.json({ success: true }); });
app.post('/api/student/doubts', async (req, res) => res.json(await Doubt.find({ studentEmail: req.body.email }).sort({ date: -1 })));
app.get('/api/videos', async (req, res) => {
    try { res.json(await Video.find().sort({ date: -1 })); } catch(e) { res.json([]); }
});

app.get('/api/potd/today', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-CA'); 
        let potd = await POTD.findOne({ dateStr: today });
        res.json({ success: !!potd, potd });
    } catch(e) { res.json({ success: false }); }
});

// ANALYTICS
app.post('/api/student/analytics', async (req, res) => {
    try {
        const results = await Result.find({ studentEmail: req.body.email });
        let topicStats = {};

        for (let r of results) {
            const topic = r.testTitle || 'Unknown Test';
            if (!topicStats[topic]) topicStats[topic] = { total: 0, obtained: 0 };
            
            topicStats[topic].total += (r.totalMarks || 0);
            topicStats[topic].obtained += (r.score || 0);
        }
        res.json({ success: true, stats: topicStats });
    } catch(e) { res.json({ success: false }); }
});

const RENDER_EXTERNAL_URL = "https://arc-classes-ankit.onrender.com"; 
function keepAlive() {
    fetch(RENDER_EXTERNAL_URL + '/api/schedule')
        .then(res => res.text())
        .then(() => console.log("⏰ Self-Ping Successful"))
        .catch(err => console.error("Self-Ping Failed:", err.message));
    setTimeout(keepAlive, 2 * 60 * 1000); 
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    keepAlive(); 
});