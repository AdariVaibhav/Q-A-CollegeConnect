// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');

// Initialize Express app
const app = express();

// Middleware for JSON parsing and URL encoding
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));

// Static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Multer storage configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});
const upload = multer({ storage });

// Mongoose Models
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}, { timestamps: true }));

const Question = mongoose.model('Question', new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track users who upvoted
    answers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }],
}, { timestamps: true }));

const Answer = mongoose.model('Answer', new mongoose.Schema({
    content: { type: String, required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track users who upvoted
    replies: [{
        content: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        file: { type: String },
        upvotes: { type: Number, default: 0 },
        upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track users who upvoted
    }],
}, { timestamps: true }));

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'User not authenticated' });
    }
};

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'Username already taken' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, password: hashedPassword });
        req.session.userId = newUser._id; // Store userId in session
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).json({ message: 'Error registering user', error });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
        
        req.session.userId = user._id; // Store userId in session
        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ message: 'Login error', error });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error in logout:', err);
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid'); // Optional: clears the session cookie
        res.json({ message: 'Logout successful' });
    });
});

// Question Routes
app.post('/api/questions', isAuthenticated, async (req, res) => {
    try {
        const { title, content } = req.body;
        const newQuestion = new Question({ title, content, userId: req.session.userId });
        await newQuestion.save();
        res.status(201).json(newQuestion);
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ message: 'Error adding question', error });
    }
});

app.get('/api/questions', async (req, res) => {
    try {
        const { sortBy, search } = req.query;
        let filter = {};
        if (search) {
            filter = { $or: [{ title: new RegExp(search, 'i') }, { content: new RegExp(search, 'i') }] };
        }
        let sortOption = {};
        if (sortBy === 'upvotes') sortOption = { upvotes: -1 };
        else if (sortBy === 'timestamp') sortOption = { createdAt: -1 };
        
        const questions = await Question.find(filter)
            .populate('userId', 'username')
            .populate({
                path: 'answers',
                populate: { path: 'userId', select: 'username' } // Populate the user info for each answer
            })
            .sort(sortOption);
        res.json(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ message: 'Error fetching questions', error });
    }
});

// Upvote a question with toggle functionality
app.post('/api/questions/:id/upvote', isAuthenticated, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        const userIndex = question.upvotedBy.indexOf(req.session.userId);
        if (userIndex > -1) {
            // User has already upvoted, decrease the upvote count
            question.upvotes -= 1;
            question.upvotedBy.splice(userIndex, 1); // Remove user from upvotedBy
        } else {
            // User has not upvoted, increase the upvote count
            question.upvotes += 1;
            question.upvotedBy.push(req.session.userId); // Add user to upvotedBy
        }

        await question.save();
        res.json(question);
    } catch (error) {
        console.error('Error upvoting question:', error);
        res.status(500).json({ message: 'Error upvoting question', error });
    }
});

// Answer Routes
app.post('/api/answers/:questionId', isAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        const answer = new Answer({
            content,
            questionId: req.params.questionId,
            userId: req.session.userId // Use userId from session
        });
        await answer.save();
        await Question.findByIdAndUpdate(req.params.questionId, { $push: { answers: answer._id } });
        res.status(201).json(answer);
    } catch (error) {
        console.error('Error adding answer:', error);
        res.status(500).json({ message: 'Error adding answer', error });
    }
});

// Reply Routes
app.post('/api/answers/:answerId/reply', isAuthenticated, upload.single('file'), async (req, res) => {
    const { content } = req.body;
    const file = req.file ? req.file.filename : null;

    try {
        const reply = { content, userId: req.session.userId, file };
        const answer = await Answer.findByIdAndUpdate(req.params.answerId, { $push: { replies: reply } }, { new: true });
        if (!answer) return res.status(404).json({ message: 'Answer not found' });
        res.status(201).json({ message: 'Reply added', reply });
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ message: 'Error adding reply', error });
    }
});

// Upvote an answer with toggle functionality
app.post('/api/answers/:answerId/upvote', isAuthenticated, async (req, res) => {
    try {
        const answer = await Answer.findById(req.params.answerId);
        if (!answer) return res.status(404).json({ message: 'Answer not found' });

        const userIndex = answer.upvotedBy.indexOf(req.session.userId);
        if (userIndex > -1) {
            // User has already upvoted, decrease the upvote count
            answer.upvotes -= 1;
            answer.upvotedBy.splice(userIndex, 1); // Remove user from upvotedBy
        } else {
            // User has not upvoted, increase the upvote count
            answer.upvotes += 1;
            answer.upvotedBy.push(req.session.userId); // Add user to upvotedBy
        }

        await answer.save();
        res.json({ message: 'Answer upvote toggled', upvotes: answer.upvotes });
    } catch (error) {
        console.error('Error upvoting answer:', error);
        res.status(500).json({ message: 'Error upvoting answer', error });
    }
});

// Upvote a reply
app.post('/api/answers/:answerId/reply/:replyId/upvote', isAuthenticated, async (req, res) => {
    try {
        const answer = await Answer.findById(req.params.answerId);
        if (!answer) return res.status(404).json({ message: 'Answer not found' });
        
        const reply = answer.replies.id(req.params.replyId);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });

        const userIndex = reply.upvotedBy.indexOf(req.session.userId);
        if (userIndex > -1) {
            // User has already upvoted, decrease the upvote count
            reply.upvotes -= 1;
            reply.upvotedBy.splice(userIndex, 1); // Remove user from upvotedBy
        } else {
            // User has not upvoted, increase the upvote count
            reply.upvotes += 1;
            reply.upvotedBy.push(req.session.userId); // Add user to upvotedBy
        }

        await answer.save();
        res.json({ message: 'Reply upvote toggled', upvotes: reply.upvotes });
    } catch (error) {
        console.error('Error upvoting reply:', error);
        res.status(500).json({ message: 'Error upvoting reply', error });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'An error occurred, please try again later.' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
