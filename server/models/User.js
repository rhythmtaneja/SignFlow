const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    
    name: {
        type: String,
        required: [true, "Please enter your name"]
    },
    email: {
        type: String,
        required: [true, "Please enter your email"],
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Please enter your password"],
        minlength: 6
    }
}, { timestamps: true});

module.exports = mongoose.model('User', UserSchema);