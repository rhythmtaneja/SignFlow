const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';

exports.register = async (req, res) => {
    try {
      const { name, email, password } = req.body;
  
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ msg: "User already exists" });
  
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword
      });

      // Generate JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

} catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Check user
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ msg: "Invalid credentials" });
  
      // Match password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
  
      // Generate JWT
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
  
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
  
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  };