const mongoose = require('mongoose'); // Erase if already required

var userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    isDoctor:{
        type: Boolean,
        default:false
    },
    isAdmin:{
        type: Boolean,
        default:false
    },
    seenNotification:{
        type:Array,
        default:[]
    },
    unseenNotification:{
        type:Array,
        default:[]
    },
    status:{
        type:String,
        default:"active"
    },
    isEmailVerified:{
        type:Boolean,
        default:false
    },
    emailVerificationToken:{
        type:String
    },
    emailVerificationExpires:{
        type:Date
    },
    resetPasswordToken:{
        type:String
    },
    resetPasswordExpires:{
        type:Date
    },
    googleId: {
        type: String
    },
    profilePicture: {
        type: String
    },
    welcomeEmailSent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('user', userSchema);
