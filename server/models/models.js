
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  website: {
    type: String,
    trim: true
  },
  websiteData: { type: String, default: "" },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  totalChats: {
    type: Number,
    default: 0
  },
  hadBasicPlan: {
    type: Boolean,
    default: false
  }
});

// QA Schema
const qaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  frequency: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  discountPrice: {
    type: Number
  },
  tokens: {
    type: Number,
    required: true
  },
  features: [{
    type: String,
    required: true
  }],
  isPopular: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days from now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  tokensUsed: {
    type: Number,
    default: 0
  }
});

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['initiated', 'processing', 'success', 'failed', 'refunded'],
    default: 'initiated'
  },
  paymentMethod: {
    type: String
  },
  paymentDetails: {
    type: Object
  },
  invoiceNumber: {
    type: String
  },
  invoiceGenerated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


// Models
const User = mongoose.model('User', userSchema);
const QA = mongoose.model('QA', qaSchema);
const Plan = mongoose.model('Plan', planSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = { User, QA, Plan, Subscription, Transaction  };
