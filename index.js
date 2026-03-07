require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs'); // 🔒 NEW: For secure passwords

// --- 0. GLOBAL ERROR CATCHERS ---
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. DATABASE CONNECTION ---
const dbLink = process.env.MONGO_URI;

if (!dbLink) {
    console.error("❌ CRITICAL ERROR: MONGO_URI is missing from your .env file!");
    process.exit(1); // 🛑 Fix: Kills the server before it crashes Mongoose
}

mongoose.connect(dbLink, { 
    serverSelectionTimeoutMS: 5000, 
    socketTimeoutMS: 45000 
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ DB Connection Error:', err.message));

// --- 2. SCHEMAS ---

const StudentSchema = new mongoose.Schema({
    name: String, 
    email: { type: String, unique: true }, 
    password: String, 
    phone: String, 
    status: { type: String, default: 'Pending' }, 
    joinedAt: { type: Date, default: Date.now },
    // 🪙 NEW GAMIFICATION FIELDS
    coins: { type: Number, default: 0 },
    lastLoginDate: { type: String, default: "" },
    lastPotdDate: { type: String, default: "" },
    unlockedItems: { type: [String], default: [] }
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
    maxCoins: { type: Number, default: 0 }, // 🪙 NEW: Max ARC Coins student can earn from this test
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
    answers: [Number], timeTaken: [Number], date: { type: Date, default: Date.now },
    coinsAwarded: { type: Boolean, default: false } // 🔒 Prevents double-claiming
});
const Result = mongoose.model('Result', ResultSchema);


// 🎡 NEW: FORTUNE WHEEL SCHEMA
const WheelPrizeSchema = new mongoose.Schema({
    label: String,     // e.g., "50 Coins", "10% Discount", "Try Again"
    type: String,      // 'coins', 'discount', 'none'
    value: Number,     // e.g., 50, 10, 0
    color: String      // Hex color for the slice
});
const WheelPrize = mongoose.model('WheelPrize', WheelPrizeSchema);


// 📜 NEW: COIN HISTORY LEDGER
const CoinHistorySchema = new mongoose.Schema({
    email: String,
    amount: Number,
    reason: String,
    date: { type: Date, default: Date.now }
});
const CoinHistory = mongoose.model('CoinHistory', CoinHistorySchema);

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

// ⚙️ NEW: ORGANIC MECHANISM SCHEMA
const MechanismSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // e.g., 'sn1', 'eas'
    title: String,
    desc: String,
    steps: [{ title: String, text: String, visual: String }], // 'visual' stores the Base64 SVG/Image
    date: { type: Date, default: Date.now }
});
const Mechanism = mongoose.model('Mechanism', MechanismSchema);

// 🎟️ UPDATED: DISCOUNT LOG SCHEMA
const DiscountLogSchema = new mongoose.Schema({
    studentName: String,
    studentEmail: String,
    studentPhone: String,
    item: String,
    code: String,
    isVerified: { type: Boolean, default: false }, // Tracks if teacher claimed it
    date: { type: Date, default: Date.now }
});
const DiscountLog = mongoose.model('DiscountLog', DiscountLogSchema);

// 🛒 NEW: ARC STORE ITEMS SCHEMA
const StoreItemSchema = new mongoose.Schema({
    title: String,
    type: String, // 'pdf', 'test', 'video', 'discount'
    cost: Number,
    link: String, // Secret PDF link, video link, or access code
    date: { type: Date, default: Date.now }
});
const StoreItem = mongoose.model('StoreItem', StoreItemSchema);

// --- 3. ROUTES ---

app.post('/api/register', async (req, res) => {
    try {
        const { name, emailPart, password, phone } = req.body; 
        const fullEmail = emailPart + "@arcstudent.com";
        
        if(await Student.findOne({ email: fullEmail })) {
            return res.json({ success: false, message: "Username Taken" });
        }

        // 🔒 Fix: Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await new Student({ name, email: fullEmail, password: hashedPassword, phone, status: 'Pending' }).save(); 
        res.json({ success: true });
    } catch (e) { 
        res.json({ success: false, message: "Error registering user." }); 
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body; 
        
        // 🔒 Fix: Ensure .env variables actually exist before checking to prevent bypass
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPass = process.env.ADMIN_PASSWORD;

        if (adminEmail && adminPass && email === adminEmail && password === adminPass) {
            return res.json({ success: true, name: "ARC Admin", email: adminEmail, role: 'admin' });
        }
        
        const student = await Student.findOne({ email });
        if (!student) return res.json({ success: false, message: "Invalid Email or Password" });
        
        // 🔒 Fix: Compare hashed passwords properly. 
        // Note: For existing plaintext passwords in your DB, this will fail. You'll need to reset them!
        const isMatch = await bcrypt.compare(password, student.password || "");
        if (!isMatch && password !== student.password) { // Temporary fallback if you still have plaintext DB entries
            return res.json({ success: false, message: "Invalid Email or Password" });
        }
        
        if (student.status === 'Pending') {
            return res.json({ success: false, message: "Your registration is under review." });
        }
        
        res.json({ 
            success: true, 
            name: student.name, 
            email: student.email, 
            role: 'student',
            coins: student.coins || 0,
            lastLoginDate: student.lastLoginDate || "",
            lastPotdDate: student.lastPotdDate || "",
            unlockedItems: student.unlockedItems || []
        });
    } catch (e) { 
        res.json({ success: false, message: "Server Error" }); 
    }
});

// --- ADMIN API ---
app.get('/api/admin/students', async (req, res) => res.json(await Student.find().sort({ joinedAt: -1 })));
app.get('/api/admin/student/:id', async (req, res) => res.json(await Student.findById(req.params.id)));

app.put('/api/admin/student/:id', async (req, res) => { 
    try {
        // If the admin is updating the password, hash it first
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);
        }
        await Student.findByIdAndUpdate(req.params.id, req.body); 
        res.json({ success: true }); 
    } catch(e) {
        res.json({ success: false, message: "Update failed" });
    }
});

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
    try { 
        res.json(await SuccessStory.find().sort({ date: -1 })); 
    } catch(e) { 
        console.error("🚨 STORY FETCH ERROR:", e); // This will print the exact error to Render!
        res.json([]); 
    }
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

// 🎡 --- WHEEL API ROUTES ---
app.get('/api/wheel', async (req, res) => {
    try { 
        let prizes = await WheelPrize.find(); 
        // If wheel is empty, provide default fallback slices so it doesn't break
        if (prizes.length === 0) {
            prizes = [
                { label: "Try Again", type: "none", value: 0, color: "#cbd5e1" },
                { label: "10 Coins", type: "coins", value: 10, color: "#38bdf8" },
                { label: "Jackpot 100", type: "coins", value: 100, color: "#fbbf24" },
                { label: "Oops!", type: "none", value: 0, color: "#ef4444" }
            ];
        }
        res.json(prizes); 
    } catch(e) { res.json([]); }
});

app.post('/api/admin/wheel', async (req, res) => {
    try { await new WheelPrize(req.body).save(); res.json({ success: true }); } catch(e) { res.json({ success: false }); }
});

app.delete('/api/admin/wheel/:id', async (req, res) => {
    try { await WheelPrize.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch(e) { res.json({ success: false }); }
});

app.post('/api/student/spin', async (req, res) => {
    try {
        const { email, cost, prizeType, prizeValue, prizeLabel } = req.body;
        const student = await Student.findOne({ email });
        
        if (!student) return res.json({ success: false, message: "Student not found" });
        if (student.coins < cost) return res.json({ success: false, message: "Not enough coins to spin!" });

        // Deduct spin cost
        student.coins -= cost; 
        
        // Award Prize
        if (prizeType === 'coins' && prizeValue > 0) {
            student.coins += prizeValue;
        }
        await student.save();
        
        // Log in Ledger
        const netCoins = prizeType === 'coins' ? prizeValue - cost : -cost;
        await new CoinHistory({ email, amount: netCoins, reason: `Wheel Spin Result: ${prizeLabel}` }).save();

        res.json({ success: true, coins: student.coins });
    } catch (e) { res.json({ success: false, message: "Server error" }); }
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

// LOGO SETTINGS ROUTES
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


// ⚙️ --- NEW MECHANISM ROUTES ---
app.get('/api/mechanisms', async (req, res) => {
    try { res.json(await Mechanism.find().sort({ date: -1 })); } catch(e) { res.json([]); }
});
app.post('/api/admin/mechanism', async (req, res) => {
    try {
        const { id, title, desc, steps } = req.body;
        // Upsert creates it if it doesn't exist, updates it if it does
        await Mechanism.findOneAndUpdate(
            { id: id },
            { title, desc, steps, date: Date.now() },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});
app.delete('/api/admin/mechanism/:id', async (req, res) => {
    try {
        await Mechanism.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});


// 🪙 --- NEW GAMIFICATION ROUTES ---
app.post('/api/student/update-coins', async (req, res) => {
    try {
        // Now accepts amount and reason to log in the ledger
        const { email, coins, lastLoginDate, lastPotdDate, amount, reason } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });

        let updateFields = { coins: coins };
        if (lastLoginDate) updateFields.lastLoginDate = lastLoginDate;
        if (lastPotdDate) updateFields.lastPotdDate = lastPotdDate;

        const updatedStudent = await Student.findOneAndUpdate({ email: email }, { $set: updateFields }, { new: true });
        if (!updatedStudent) return res.status(404).json({ success: false, message: 'Student not found.' });

        // Log to history if an amount was changed
        if (amount && reason) await new CoinHistory({ email, amount, reason }).save();

        res.json({ success: true, coins: updatedStudent.coins });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 🎟️ --- DISCOUNT & VERIFICATION ROUTES ---
app.post('/api/admin/log-discount', async (req, res) => {
    try {
        const { email, item, code } = req.body;
        const student = await Student.findOne({ email });
        await new DiscountLog({
            studentName: student ? student.name : 'Unknown',
            studentEmail: email,
            studentPhone: student ? student.phone : 'N/A',
            item: item,
            code: code
        }).save();
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});

app.get('/api/admin/discount-logs', async (req, res) => {
    try { res.json(await DiscountLog.find().sort({ isVerified: 1, date: -1 })); } catch(e) { res.json([]); }
});

app.put('/api/admin/discount-logs/:id', async (req, res) => {
    try {
        const log = await DiscountLog.findById(req.params.id);
        log.isVerified = !log.isVerified; 
        await log.save();
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});

app.delete('/api/admin/discount-logs/:id', async (req, res) => {
    try { await DiscountLog.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch(e) { res.json({ success: false }); }
});

// 🎓 NEW: Student fetching their active discounts (Valid for 30 Days)
app.post('/api/student/my-discounts', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activeDiscounts = await DiscountLog.find({
            studentEmail: req.body.email,
            date: { $gte: thirtyDaysAgo } // Only fetch if bought within 30 days
        }).sort({ date: -1 });
        
        res.json(activeDiscounts);
    } catch (e) { res.json([]); }
});

// 🛒 --- STORE API ROUTES ---
app.get('/api/store', async (req, res) => {
    try { res.json(await StoreItem.find().sort({ cost: 1 })); } catch(e) { res.json([]); }
});

app.post('/api/admin/store', async (req, res) => {
    try { await new StoreItem(req.body).save(); res.json({ success: true }); } catch(e) { res.json({ success: false }); }
});

app.delete('/api/admin/store/:id', async (req, res) => {
    try { await StoreItem.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch(e) { res.json({ success: false }); }
});

// --- STUDENT API ---
app.get('/api/materials', async (req, res) => {
    try { res.json(await Material.find()); } catch(e) { res.json([]); }
});
app.get('/api/tests', async (req, res) => {
    try {
        // Now returns maxCoins so frontend knows how much a test is worth
        const tests = await Test.find({}, 'title duration category date accessCode isLive startTime endTime maxCoins');
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

// 🪙 NEW ROUTE: Process Premium Store Purchases
app.post('/api/student/buy-item', async (req, res) => {
    try {
        const { email, itemId, cost, title } = req.body;
        const student = await Student.findOne({ email });
        
        if (!student) return res.json({ success: false, message: "Student not found" });
        if (student.coins < cost) return res.json({ success: false, message: "Not enough coins!" });

        student.coins -= cost;
        if (!student.unlockedItems) student.unlockedItems = [];
        if (!student.unlockedItems.includes(itemId)) student.unlockedItems.push(itemId);
        
        await student.save();
        
        // Log the purchase in the ledger!
        await new CoinHistory({ email, amount: -cost, reason: `Purchased: ${title || 'Store Item'}` }).save();
        
        res.json({ success: true, coins: student.coins, unlockedItems: student.unlockedItems });
    } catch (e) { res.json({ success: false, message: "Server error" }); }
});

// 🔒 SECURE TEST COIN CLAIM ROUTE
app.post('/api/claim-test-coins', async (req, res) => {
    try {
        const { resultId } = req.body;
        const result = await Result.findById(resultId);
        
        // Block if already awarded or invalid
        if (!result || result.coinsAwarded) return res.json({ success: false });

        const test = await Test.findById(result.testId);
        if (!test || !test.maxCoins || test.maxCoins <= 0) return res.json({ success: false });

        // Calculate coins server-side
        let earned = Math.round((result.percentage / 100) * test.maxCoins);
        
        // Lock this result permanently
        result.coinsAwarded = true;
        await result.save();

        res.json({ success: true, amount: earned });
    } catch (e) { res.json({ success: false }); }
});

// 📜 FETCH COIN HISTORY ROUTE
app.post('/api/student/coin-history', async (req, res) => {
    try {
        const history = await CoinHistory.find({ email: req.body.email }).sort({ date: -1 });
        res.json(history);
    } catch(e) { res.json([]); }
});

// 🔄 UPDATE: Material Unlock to check for Premium Purchases
// 🔒 SECURE MATERIAL UNLOCK
app.post('/api/material/unlock', async (req, res) => {
    try {
        const { id, code, studentEmail } = req.body;
        const f = await Material.findById(id);
        const s = await Student.findOne({ email: studentEmail });
        
        if (studentEmail !== process.env.ADMIN_EMAIL) {
            const storeItem = await StoreItem.findOne({ type: 'pdf', link: id });
            const isUnlocked = s && s.unlockedItems && s.unlockedItems.includes(id);
            if (storeItem && !isUnlocked) {
                return res.json({ success: false, message: "Premium File: Please unlock this in the ARC Store." });
            }
        }

        const isUnlocked = s && s.unlockedItems && s.unlockedItems.includes(id);

        if(f && (!f.accessCode || f.accessCode === code || isUnlocked)) {
            res.json({ success: true, link: f.link });
        } else { 
            res.json({ success: false }); 
        }
    } catch (e) {
        // Catches bad IDs and prevents the request from hanging
        res.json({ success: false, message: "Error unlocking material." });
    }
});


app.post('/api/result-details', async (req, res) => {
    try {
        const result = await Result.findById(req.body.resultId);
        if(!result) return res.json({ success: false, message: "Result Not Found" });
        
        // 🚀 Fix: Let the DB calculate rank (Count how many scores are strictly greater)
        const higherScoresCount = await Result.countDocuments({ 
            testId: result.testId, 
            score: { $gt: result.score } 
        });
        const rank = higherScoresCount + 1;

        // Fetch top 10 for leaderboard, not the whole database!
        const topResults = await Result.find({ testId: result.testId })
            .sort({ score: -1 })
            .limit(10);
            
        const leaderboard = topResults.map((r, i) => ({ rank: i + 1, name: r.studentName, score: r.score, total: r.totalMarks }));

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

// 🔒 SECURE TEST START
// 🔒 SECURE TEST START
app.post('/api/test/start', async (req, res) => {
    try {
        const { id, code, studentEmail } = req.body; 
        if (studentEmail !== process.env.ADMIN_EMAIL) {
            const s = await Student.findOne({ email: studentEmail });
            if(!s) return res.json({ success: false, message: "Login first" });
            
            const storeItem = await StoreItem.findOne({ type: 'test', link: id });
            const isUnlocked = s && s.unlockedItems && s.unlockedItems.includes(id);
            if (storeItem && !isUnlocked) {
                return res.json({ success: false, message: "Premium Test: Please unlock this in the ARC Store." });
            }
        }
        const t = await Test.findById(id);
        if (!t) return res.json({ success: false, message: "Test not found." }); // 🐛 Fix: Prevents crashing if test deleted
        
        // 🐛 Fix: Use environment variable instead of hardcoded 'admin@arc.com'
        if(t.isLive && studentEmail !== process.env.ADMIN_EMAIL) {
            const now = new Date();
            if(now < new Date(t.startTime)) return res.json({ success: false, message: "Not Started" });
            if(now > new Date(t.endTime)) return res.json({ success: false, message: "Expired" });
        }
        if(!t.accessCode || t.accessCode === "" || t.accessCode === code) {
            const safeQ = t.questions.map(q => ({ text: q.text, image: q.image, options: q.options, marks: q.marks || 4, negative: q.negative !== undefined ? q.negative : 0 }));
            res.json({ success: true, test: {...t._doc, questions: safeQ} });
        } else res.json({ success: false, message: "Wrong Password" });
    } catch (e) { res.json({ success: false, message: "Server Error" }); }
});

app.post('/api/test/submit', async (req, res) => {
    try {
        const { testId, answers, timeTaken, studentName, studentEmail } = req.body; 
        const t = await Test.findById(testId);
        
        if (!t) return res.json({ success: false, message: "Test was deleted before submission." }); // 🐛 Fix: Crash prevention

        let score = 0, total = 0;
        t.questions.forEach((q, i) => {
    const marks = q.marks || 4;
    const neg = q.negative !== undefined ? q.negative : 0;
    total += marks;
    
    if (answers[i] === q.correct) {
        score += marks;
    } else if (answers[i] !== null && answers[i] !== undefined && answers[i] !== -1) {
        // Only deduct if an actual wrong answer was explicitly chosen
        score -= neg; 
    }
});
        
        const pct = (score / total) * 100;
        const r = new Result({ 
            studentName, studentEmail, testTitle: t.title, testId: t._id, testType: t.isLive ? 'live' : 'practice', 
            score, totalMarks: total, percentage: pct, rank: 0, feedback: pct>80?"Excellent":"Keep Improving", 
            answers, timeTaken 
        });
        await r.save();
        res.json({ success: true, score, resultId: r._id });
    } catch(e) { res.json({ success: false, message: "Submission failed" }); }
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

const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || "http://localhost:5000"; 
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