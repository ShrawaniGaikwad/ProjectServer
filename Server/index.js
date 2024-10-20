const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const dotenv = require('dotenv');

dotenv.config(); 

const app = express();

app.use(helmet()); 
app.use(cors()); 
app.use(express.json({ limit: '10kb' })); 
app.use(mongoSanitize()); 
app.use(xss()); 

const limiter = rateLimit({
    max: 100, 
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests, please try again later.',
});
app.use('/help', limiter);
app.use('/contact', limiter);

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
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
    Message: String
});

const Help = mongoose.model('help', helpSchema,'help');
const Contact = mongoose.model('contact', contactSchema,'contact');

app.post('/help', async (req, res) => {
    try {
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
