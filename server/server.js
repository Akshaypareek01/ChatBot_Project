
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const { User, QA,Plan,Subscription,Transaction  } = require('./models/models');
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

const checkSubscriptionExpiration = async () => {
  try {
    const now = new Date();
    
    // Find active subscriptions that have ended
    const expiredSubscriptions = await Subscription.find({
      endDate: { $lt: now },
      isActive: true,
      isExpired: false
    });
    
    if (expiredSubscriptions.length > 0) {
      console.log(`Updating ${expiredSubscriptions.length} expired subscriptions`);
      
      // Update all expired subscriptions
      await Promise.all(expiredSubscriptions.map(async (subscription) => {
        subscription.isExpired = true;
        return subscription.save();
      }));
    }
  } catch (error) {
    console.error('Error checking subscription expiration:', error);
  }
};

// Run the check initially and then every hour
checkSubscriptionExpiration();
setInterval(checkSubscriptionExpiration, 60 * 60 * 1000);
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

app.put('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const { name, website } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.name = name;
    user.website = website;
    
    await user.save();
    
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        website: user.website
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User password update
app.put('/api/users/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    await user.save();
    
    return res.status(200).json({ message: 'Password updated successfully' });
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
    
    // Get user to check if they've ever had the basic plan
    const user = await User.findById(req.userId);
    
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
    } else {
      // Check if subscription has expired but not marked as expired
      const now = new Date();
      if (now > new Date(subscription.endDate) && !subscription.isExpired && subscription.planId.name !== 'Free') {
        subscription.isExpired = true;
        await subscription.save();
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
      isExpired: subscription?.isExpired,
      tokensUsed: subscription?.tokensUsed,
      hadBasicPlan: user.hadBasicPlan || false
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
    
    // Check if trying to subscribe to the Basic plan
    if (plan.name === 'Basic Plan') {
      const user = await User.findById(req.userId);
      if (user.hadBasicPlan) {
        return res.status(403).json({ 
          message: 'You can only subscribe to the Basic plan once. Please choose another plan.'
        });
      }
      
      // Mark user as having had the Basic plan
      user.hadBasicPlan = true;
      await user.save();
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
      isExpired: false,
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

app.put('/api/admin/users/:id/subscription', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { endDate, isActive, isExpired } = req.body;
    
    const subscription = await Subscription.findOne({ 
      userId: req.params.id,
      isActive: true
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Active subscription not found for this user' });
    }
    
    subscription.endDate = endDate || subscription.endDate;
    subscription.isActive = isActive !== undefined ? isActive : subscription.isActive;
    subscription.isExpired = isExpired !== undefined ? isExpired : subscription.isExpired;
    
    await subscription.save();
    
    return res.status(200).json({
      message: 'Subscription updated successfully',
      subscription
    });
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

//Cashfree payment methods

app.post('/api/payments/create-order', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    
    // Get the user and plan details
    const [user, plan] = await Promise.all([
      User.findById(req.userId),
      Plan.findById(planId)
    ]);
    
    if (!user || !plan) {
      return res.status(404).json({ message: 'User or plan not found' });
    }
    
    // Check if trying to subscribe to the Basic plan
    if (plan.name === 'Basic plan') {
      const user = await User.findById(req.userId);
      if (user.hadBasicPlan) {
        return res.status(403).json({ 
          message: 'You can only subscribe to the Basic plan once. Please choose another plan.'
        });
      }
    }
    
    // Generate a unique order ID
    const orderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    const amount = plan.discountPrice || plan.price;
    
    // Create a transaction record
    const transaction = new Transaction({
      userId: user._id,
      planId: plan._id,
      orderId,
      amount,
      status: 'initiated'
    });
    
    await transaction.save();
    
    // In a production environment, this would be a call to Cashfree API
    // For now, we're just returning the order details
    
    const cashfreePayload = {
      orderId,
      orderAmount: amount,
      orderCurrency: 'INR',
      orderNote: `Subscription to ${plan.name}`,
      customerName: user.name,
      customerEmail: user.email,
      returnUrl: `${process.env.BASE_URL}/payment/callback?orderId=${orderId}`
    };
    
    // In a real implementation, this would call the Cashfree API
    // const cashfreeResponse = await axios.post('https://test.cashfree.com/api/v2/cftoken/order', cashfreePayload, {
    //   headers: {
    //     'x-client-id': process.env.CASHFREE_APP_ID,
    //     'x-client-secret': process.env.CASHFREE_SECRET_KEY
    //   }
    // });
    
    // For now, we'll simulate the response
    const mockCashfreeResponse = {
      orderId,
      orderAmount: amount,
      orderCurrency: 'INR',
      orderNote: `Subscription to ${plan.name}`,
      orderStatus: 'ACTIVE',
      paymentLink: `${process.env.BASE_URL}/payment/simulate?orderId=${orderId}`
    };
    
    return res.status(200).json({
      success: true,
      order: mockCashfreeResponse,
      transaction: {
        id: transaction._id,
        orderId: transaction.orderId,
        amount: transaction.amount
      }
    });
  } catch (error) {
    console.error('Payment order creation error:', error);
    return res.status(500).json({ message: 'Error creating payment order', error: error.message });
  }
});

app.post('/api/payments/callback', async (req, res) => {
  try {
    const { orderId, transactionId, orderAmount, paymentMode, referenceId, txStatus, txTime, signature } = req.body;
    
    // In a production environment, verify the signature using the Cashfree secret key
    // Here we'll just update the transaction
    
    const transaction = await Transaction.findOne({ orderId });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Update transaction status based on payment status
    transaction.transactionId = transactionId || referenceId;
    transaction.status = txStatus === 'SUCCESS' ? 'success' : 'failed';
    transaction.paymentMethod = paymentMode;
    transaction.paymentDetails = req.body;
    transaction.updatedAt = Date.now();
    
    await transaction.save();
    
    if (transaction.status === 'success') {
      // Create or update subscription
      await Subscription.updateMany(
        { userId: transaction.userId, isActive: true },
        { isActive: false }
      );
      
      const plan = await Plan.findById(transaction.planId);
      
      // Create new subscription
      const newSubscription = new Subscription({
        userId: transaction.userId,
        planId: transaction.planId,
        isExpired: false,
        tokensUsed: 0
      });
      
      await newSubscription.save();
      
      // Update the transaction with subscription ID
      transaction.subscriptionId = newSubscription._id;
      await transaction.save();
      
      // If the plan is Basic, mark the user as having had the Basic plan
      if (plan.name === 'Basic') {
        await User.findByIdAndUpdate(transaction.userId, { hadBasicPlan: true });
      }
      
      return res.redirect(`${process.env.BASE_URL}/payment/success?orderId=${orderId}`);
    } else {
      return res.redirect(`${process.env.BASE_URL}/payment/failed?orderId=${orderId}`);
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    return res.status(500).json({ message: 'Error processing payment callback', error: error.message });
  }
});

// For simulation purposes
app.get('/api/payments/simulate/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.query;
    
    const transaction = await Transaction.findOne({ orderId });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Update transaction status based on simulated payment status
    transaction.transactionId = 'sim_tx_' + Date.now();
    transaction.status = status === 'failed' ? 'failed' : 'success';
    transaction.paymentMethod = 'SIMULATION';
    transaction.paymentDetails = { orderId, simulatedStatus: status };
    transaction.updatedAt = Date.now();
    
    await transaction.save();
    
    if (transaction.status === 'success') {
      // Create or update subscription
      await Subscription.updateMany(
        { userId: transaction.userId, isActive: true },
        { isActive: false }
      );
      
      const plan = await Plan.findById(transaction.planId);
      
      // Create new subscription
      const newSubscription = new Subscription({
        userId: transaction.userId,
        planId: transaction.planId,
        isExpired: false,
        tokensUsed: 0
      });
      
      await newSubscription.save();
      
      // Update the transaction with subscription ID
      transaction.subscriptionId = newSubscription._id;
      await transaction.save();
      
      // If the plan is Basic, mark the user as having had the Basic plan
      if (plan.name === 'Basic') {
        await User.findByIdAndUpdate(transaction.userId, { hadBasicPlan: true });
      }
      
      return res.json({ success: true, message: 'Payment simulation successful', transaction });
    } else {
      return res.json({ success: false, message: 'Payment simulation failed', transaction });
    }
  } catch (error) {
    console.error('Payment simulation error:', error);
    return res.status(500).json({ message: 'Error simulating payment', error: error.message });
  }
});

// Get transactions for current user
app.get('/api/users/transactions', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId })
      .populate('planId')
      .sort({ createdAt: -1 });
    
    return res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
});

// Admin endpoints for transactions
app.get('/api/admin/transactions', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const transactions = await Transaction.find()
      .populate('userId', 'name email')
      .populate('planId', 'name price discountPrice')
      .sort({ createdAt: -1 });
    
    return res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
});

// Generate invoice for a transaction
app.post('/api/admin/transactions/:id/generate-invoice', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'name email website')
      .populate('planId', 'name price discountPrice');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (transaction.status !== 'success') {
      return res.status(400).json({ message: 'Cannot generate invoice for unsuccessful transaction' });
    }
    
    // Generate invoice number
    const invoiceNumber = 'INV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    transaction.invoiceNumber = invoiceNumber;
    transaction.invoiceGenerated = true;
    
    await transaction.save();
    
    return res.status(200).json({
      message: 'Invoice generated successfully',
      transaction
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return res.status(500).json({ message: 'Error generating invoice', error: error.message });
  }
});

app.get('/api/admin/transactions/:id/invoice', authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'name email website')
      .populate('planId', 'name price discountPrice');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (!transaction.invoiceGenerated) {
      return res.status(400).json({ message: 'Invoice not yet generated for this transaction' });
    }
    
    // In a real application, you would generate a PDF here
    // For now, we just return the invoice data
    
    const invoiceData = {
      invoiceNumber: transaction.invoiceNumber,
      date: transaction.createdAt,
      customerName: transaction.userId.name,
      customerEmail: transaction.userId.email,
      customerWebsite: transaction.userId.website,
      planName: transaction.planId.name,
      amount: transaction.amount,
      currency: transaction.currency,
      transactionId: transaction.transactionId,
      orderId: transaction.orderId,
      status: transaction.status
    };
    
    return res.status(200).json(invoiceData);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
