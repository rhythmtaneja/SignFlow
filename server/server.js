const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();


const docRoutes = require('./routes/docRoutes');
const authRoutes = require('./routes/authRoutes');
const auth = require('./middleware/auth');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
const signatureRoutes = require('./routes/signatureRoutes');

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = [
  'https://sign-flow-y9li.vercel.app', // production
  /^https:\/\/sign-flow-y9li-[a-z0-9]+-rhythm-tanejas-projects\.vercel\.app$/ // all Vercel preview domains for your project
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.some(o =>
        typeof o === 'string'
          ? o === origin
          : o instanceof RegExp && o.test(origin)
      )
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-signature-app');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Auth routes
app.use('/api/auth', authRoutes);

app.use('/api/signatures', signatureRoutes);
app.use('/api/audit', auditRoutes);

// Example of protected route
app.get('/api/protected', auth, (req, res) => {
  res.json({ msg: "You are authorized!", user: req.user });
});

app.use('/api/docs', docRoutes);

app.use('/uploads', express.static('uploads'));


// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'PDF Signature API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

console.log('process.env.PORT:', process.env.PORT);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Health Check: http://localhost:${PORT}/api/health`);
});
