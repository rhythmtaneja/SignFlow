const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';

function auth(req, res, next) {
    // Check for token in Authorization header first
    let token = req.header('Authorization');
    
    // Extract token from "Bearer <token>" format
    if (token && token.startsWith('Bearer ')) {
        token = token.substring(7);
    }
    
    // If no token in Authorization header, check x-auth-token header
    if (!token) {
        token = req.header('x-auth-token');
    }
    
    // If no token in header, check in body (for file uploads)
    if (!token && req.body && req.body.token) {
        token = req.body.token;
    }
  
    if (!token)
      return res.status(401).json({ msg: "No token, authorization denied" });
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      console.error(e);
      if (e.name === 'TokenExpiredError') {
        res.status(401).json({ msg: "Token expired", expired: true });
      } else {
        res.status(400).json({ msg: "Token is not valid" });
      }
    }
  }
  
  module.exports = auth;