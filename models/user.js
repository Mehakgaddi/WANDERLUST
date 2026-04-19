const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  isAdmin: {
    type: Boolean,
    default: false, // only one admin account, set via seed script
  },
});

// passport-local-mongoose adds username, hash, salt fields automatically
// and also adds methods like authenticate, register, serializeUser, deserializeUser
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
module.exports = User;
