const express = require("express");
const router = express.Router();
const passport = require("passport");

const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/expressError.js");
const { userSchema } = require("../schema.js");
const User = require("../models/user.js");
const { saveRedirectUrl } = require("../utils/authMiddleware.js");

// middleware to validate signup form
const validateUser = (req, res, next) => {
  let { error } = userSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// middleware to check if user is already logged in
const isAlreadyLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.flash("error", "You are already logged in!");
    return res.redirect("/listings");
  }
  next();
};

// signup - show form
router.get("/signup", isAlreadyLoggedIn, (req, res) => {
  res.render("users/signup.ejs");
});

// signup - handle form submission
router.post(
  "/signup",
  isAlreadyLoggedIn,
  validateUser,
  wrapAsync(async (req, res, next) => {
    let { username, email, password } = req.body.user;

    // check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      req.flash("error", "An account with this email already exists!");
      return res.redirect("/signup");
    }

    // check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      req.flash("error", "This username is already taken. Please choose another!");
      return res.redirect("/signup");
    }

    const newUser = new User({ username, email });

    // register method from passport-local-mongoose handles password hashing
    // wrap in try-catch to handle any duplicate key errors gracefully
    let registeredUser;
    try {
      registeredUser = await User.register(newUser, password);
    } catch (err) {
      req.flash("error", err.message || "Something went wrong during signup. Please try again.");
      return res.redirect("/signup");
    }

    // log the user in right after signup
    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", `Welcome to WanderLust, ${username}!`);
      res.redirect("/listings");
    });
  })
);

// login - show form
router.get("/login", isAlreadyLoggedIn, (req, res) => {
  res.render("users/login.ejs");
});

// login - handle form submission using passport.authenticate
router.post(
  "/login",
  isAlreadyLoggedIn,
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true, // passport-local-mongoose sets the flash message automatically
  }),
  (req, res) => {
    req.flash("success", `Welcome back, ${req.user.username}!`);
    // redirect to the page user was trying to visit, or /listings
    const redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
  }
);

// logout
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You have been logged out successfully!");
    res.redirect("/listings");
  });
});

module.exports = router;
