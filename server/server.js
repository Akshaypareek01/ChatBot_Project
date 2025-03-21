
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const { User, QA,Plan,Subscription  } = require('./models/models');
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

// User routes


app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password, website } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      website,
      isActive: true // Users need admin approval
    });
    
    const userdata =await newUser.save();
    // console.log("New user data: ",userdata);
    let subscription = await Subscription.findOne({ 
      userId: userdata._id,
      isActive: true
    }).populate('planId');
    
    if (!subscription) {
      // Create a free tier subscription
      const freePlan = await Plan.findOne({ name: 'Basic Plan' });
      
      if (freePlan) {
        subscription = new Subscription({
          userId: userdata._id,
          planId: freePlan._id,
          tokensUsed: 0
        });
        
        await subscription.save();
        subscription = await Subscription.findById(subscription._id).populate('planId');
      }
    }
    return res.status(201).json({ message: 'Registration successful. An admin will review and approve your account.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is pending approval by the administrator' });
    }
    
    // Update last active timestamp
    user.lastActive = Date.now();
    await user.save();
    
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

app.get('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/users/qa', authMiddleware, async (req, res) => {
  try {
    const qas = await QA.find({ userId: req.userId });
    
    return res.status(200).json(qas);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/users/qa', authMiddleware, async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    
    const newQA = new QA({
      userId: req.userId,
      question,
      answer,
      category: category || 'General',
      frequency: 0,
    });
    
    await newQA.save();
    
    return res.status(201).json(newQA);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/users/qa/:id', authMiddleware, async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    
    const qa = await QA.findById(req.params.id);
    
    if (!qa) {
      return res.status(404).json({ message: 'QA not found' });
    }
    
    if (qa.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this QA' });
    }
    
    qa.question = question;
    qa.answer = answer;
    qa.category = category || 'General';
    qa.updatedAt = Date.now();
    
    await qa.save();
    
    return res.status(200).json(qa);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/users/qa/:id', authMiddleware, async (req, res) => {
  try {
    const qa = await QA.findById(req.params.id);
    
    if (!qa) {
      return res.status(404).json({ message: 'QA not found' });
    }
    
    if (qa.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this QA' });
    }
    
    await QA.deleteOne({ _id: req.params.id });
    
    return res.status(200).json({ message: 'QA deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/users/subscription', authMiddleware, async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ 
      userId: req.userId,
      isActive: true
    }).populate('planId');
    
    if (!subscription) {
      // Create a free tier subscription
      const freePlan = await Plan.findOne({ name: 'Basic Plan' });
      
      if (freePlan) {
        subscription = new Subscription({
          userId: req.userId,
          planId: freePlan._id,
          tokensUsed: 0
        });
        
        await subscription.save();
        subscription = await Subscription.findById(subscription._id).populate('planId');
      }
    }
    
    return res.status(200).json({
      _id: subscription?._id,
      userId: subscription?.userId,
      planId: subscription?.planId?._id,
      plan: subscription?.planId,
      startDate: subscription?.startDate,
      endDate: subscription?.endDate,
      isActive: subscription?.isActive,
      tokensUsed: subscription?.tokensUsed
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/users/subscribe', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Deactivate any existing subscriptions
    await Subscription.updateMany(
      { userId: req.userId, isActive: true },
      { isActive: false }
    );
    
    // Create new subscription
    const newSubscription = new Subscription({
      userId: req.userId,
      planId: plan._id,
      tokensUsed: 0
    });
    
    await newSubscription.save();
    
    return res.status(200).json({
      message: 'Subscription updated successfully',
      subscription: newSubscription
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/users/chatbot', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'Chatbot not available' });
    }
    
    const qas = await QA.find({ userId: req.userId });
    
    return res.status(200).json({
      userId: req.userId,
      name: user.name,
      qas
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin User Management (Admin)
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

// Plans
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await Plan.find().sort('price');
    return res.status(200).json(plans);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/admin/plans', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { name, description, price, discountPrice, tokens, features, isPopular } = req.body;
    
    const newPlan = new Plan({
      name,
      description,
      price,
      discountPrice,
      tokens,
      features,
      isPopular
    });
    
    await newPlan.save();
    
    return res.status(201).json(newPlan);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/plans/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { name, description, price, discountPrice, tokens, features, isPopular } = req.body;
    
    const updatedPlan = await Plan.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        description, 
        price, 
        discountPrice, 
        tokens, 
        features, 
        isPopular,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!updatedPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    return res.status(200).json(updatedPlan);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/admin/plans/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const deletedPlan = await Plan.findByIdAndDelete(req.params.id);
    
    if (!deletedPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    return res.status(200).json({ message: 'Plan deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
