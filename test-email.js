const nodemailer = require('nodemailer');

// 👇 PASTE YOUR REAL DETAILS DIRECTLY HERE FOR TESTING
const email = 'arcclasses25kashipur@gmail.com'; 
const password = 'yuckevozxamncjta'; // NO SPACES. 16 chars.

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: email, pass: password }
});

async function sendTest() {
    console.log("⏳ Attempting to connect to Google...");
    try {
        await transporter.verify();
        console.log("✅ SUCCESS! Password is correct.");
        
        const info = await transporter.sendMail({
            from: email,
            to: email, // Send to yourself
            subject: "Test Email",
            text: "It works!"
        });
        console.log("📧 Email sent: ", info.messageId);
    } catch (error) {
        console.log("❌ FAILURE. Google rejected the connection.");
        console.error(error.message); // THIS IS THE IMPORTANT PART
    }
}

sendTest();