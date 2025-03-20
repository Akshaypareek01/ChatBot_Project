
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const { User, QA } = require('./models/models');
const { default: axios } = require('axios');

// Configure environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;



// Middleware
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: "", // Set in .env
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin || false;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');  // Serve your main HTML
});


// Admin Routes
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check hardcoded admin credentials
    if (email === 'admin@gmail.com' && password === 'admin1234') {
      const token = jwt.sign(
        { isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return res.status(200).json({ token });
    }
    
    return res.status(401).json({ message: 'Invalid admin credentials' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Authentication Routes
const getWebsiteData = async (url) => {
  try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      let websiteContent = "";

      $('p, h1, h2, h3').each((index, element) => {
          websiteContent += $(element).text() + "\n";
      });

      return websiteContent;
  } catch (error) {
      console.error("Error fetching website content:", error);
      return null;
  }
};

const getAnswer = async (req, res) => {
  try {
    const { userId, question } = req.body;

    if (!userId || !question) {
      return res.status(400).json({ message: 'User ID and question are required.' });
    }

    // Search for the question specific to the user
    const qa = await QA.findOne({ userId, question: { $regex: question, $options: 'i' } });

    if (qa) {
      // Increase frequency for analytics
      await QA.findByIdAndUpdate(qa._id, { $inc: { frequency: 1 }, updatedAt: Date.now() });

      return res.json({ answer: qa.answer, source: 'database' });
    } else {
      return res.json({ answer: null }); // No stored answer, frontend should call AI
    }
  } catch (error) {
    console.error('Error fetching answer:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📌 Get AI-generated response (Only if no stored answer exists)
const getAIResponse = async (req, res) => {
  try {
    const { userId, question, category = 'General' } = req.body;

    if (!userId || !question) {
      return res.status(400).json({ message: 'User ID and question are required.' });
    }

    // Call OpenAI API to generate an AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: 'system', content: 'Only answer questions relevant to the website content.' }, { role: 'user', content: question }],
      temperature: 0.7,
      max_tokens: 100,
    });

    const aiAnswer = completion.choices[0]?.message?.content || "I'm not sure about that.";

    // Save AI-generated response in the database for the user
    // const newQA = new QA({
    //   userId,
    //   question,
    //   answer: aiAnswer,
    //   category,
    //   frequency: 1,
    // });

    // await newQA.save();

    return res.json({ answer: aiAnswer, source: 'AI-generated' });
  } catch (error) {
    console.error('Error getting AI response:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password, website } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const websiteData = await getWebsiteData(website);
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      website,
      websiteData: websiteData || "Website content could not be fetched",
      isActive: true
    });
    
    await newUser.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return res.status(201).json({ token, user: { id: newUser._id, name, email, website } });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return res.status(200).json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        website: user.website, 
        isActive: user.isActive 
      } 
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Management (Admin)
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const users = await User.find().select('-password');
    
    // Get Q&As for each user
    const enhancedUsers = await Promise.all(users.map(async (user) => {
      const qas = await QA.find({ userId: user._id });
      return {
        ...user.toObject(),
        qaCount: qas.length
      };
    }));
    
    return res.status(200).json(enhancedUsers);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { name, email, password, website } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      website,
      isActive: true
    });
    
    await newUser.save();
    
    return res.status(201).json({ 
      user: { 
        id: newUser._id, 
        name, 
        email, 
        website, 
        isActive: true 
      } 
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/users/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { name, email, website, isActive } = req.body;
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, website, isActive },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Delete user
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete all user's QAs
    await QA.deleteMany({ userId: req.params.id });
    
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// QA Management (Admin & Users)
app.get('/api/qa/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const qas = await QA.find({ userId });
    
    return res.status(200).json(qas);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/admin/qa', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { userId, question, answer, category } = req.body;
    
    // Create new QA
    const newQA = new QA({
      userId,
      question,
      answer,
      category: category || 'General',
      frequency: 0
    });
    
    await newQA.save();
    
    return res.status(201).json(newQA);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/qa/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { question, answer, category } = req.body;
    
    // Update QA
    const updatedQA = await QA.findByIdAndUpdate(
      req.params.id,
      { 
        question, 
        answer, 
        category: category || 'General',
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!updatedQA) {
      return res.status(404).json({ message: 'QA not found' });
    }
    
    return res.status(200).json(updatedQA);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/admin/qa/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Delete QA
    const deletedQA = await QA.findByIdAndDelete(req.params.id);
    
    if (!deletedQA) {
      return res.status(404).json({ message: 'QA not found' });
    }
    
    return res.status(200).json({ message: 'QA deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Chatbot Endpoints (Public)
app.get('/api/chatbot/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists and is active
    const user = await User.findById(userId);
    
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'Chatbot not available' });
    }
    
    const qas = await QA.find({ userId });
    
    return res.status(200).json({
      userId,
      name: user.name,
      qas
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/chatbot/log', async (req, res) => {
  try {
    const { userId, question } = req.body;
    
    // Log unanswered question for future review
    console.log(`Unanswered question for user ${userId}: ${question}`);
    
    return res.status(200).json({ message: 'Question logged successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/chatbot/frequency', async (req, res) => {
  try {
    const { qaId } = req.body;
    
    // Increment frequency count
    const qa = await QA.findByIdAndUpdate(
      qaId,
      { $inc: { frequency: 1 } },
      { new: true }
    );
    
    if (!qa) {
      return res.status(404).json({ message: 'QA not found' });
    }
    
    return res.status(200).json({ message: 'Frequency updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
