const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const dotenv = require('dotenv');
const axios = require('axios');


dotenv.config(); 

const app = express();

app.use(helmet()); 
app.use(cors()); 
app.use(express.json({ limit: '10kb' })); 
app.use(mongoSanitize()); 
app.use(xss()); 
app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors 'self' https://www.google.com https://www.gstatic.com"
    );
    next();
  });

const limiter = rateLimit({
    max: 100, 
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests, please try again later.',
});
app.use('/help', limiter);
app.use('/contact', limiter);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Error connecting to MongoDB:', error));

const helpSchema = new mongoose.Schema({
    Name: String,
    Phone: String,
    Email: String,
    CompanyName: String,
    Query: String
});

const contactSchema = new mongoose.Schema({
    Name: String,
    Email: String,
    Phone: String,
    Subject: String,
    Query: String
});

const Help = mongoose.model('help', helpSchema,'help');
const Contact = mongoose.model('contact', contactSchema,'contact');


const verifyRecaptcha = async (token) => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY; 
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    try {
        const response = await axios.post(url);
        console.log("Response from reCAPTCHA:", response.data);

        console.log("Captcha verified successfully");
        return response.data.success; 
    } catch (error) {
        console.error('Error verifying reCAPTCHA:', error);
        return false;
    }
};
app.post('/help', async (req, res) => {
    try {

        const { recaptcha } = req.body;

        const isCaptchaValid = await verifyRecaptcha(recaptcha);
        if (!isCaptchaValid) {
            return res.status(400).json({ error: 'Invalid reCAPTCHA. Please try again.' });
        }

        console.log(req.body)
        const newHelp = new Help(req.body);

        const savedHelp = await newHelp.save();
        res.json({ message: 'Help data added successfully', newHelp: savedHelp });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/contact', async (req, res) => {
    try {

        const { recaptcha } = req.body;
        const isCaptchaValid = await verifyRecaptcha(recaptcha);
        if (!isCaptchaValid) {
            return res.status(400).json({ error: 'Invalid reCAPTCHA. Please try again.' });
        }
        const newContact = new Contact(req.body);
        const savedContact = await newContact.save();
        res.json({ message: 'Contact data added successfully', newContact: savedContact });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
