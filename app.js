const express = require("express");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const port = process.env.PORT || 5000;
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/expressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const { MongoStore } = require("connect-mongo");
require("dotenv").config();

const listings = require("./routes/listing.js");
const reviews = require("./routes/review.js");
const bookings = require("./routes/booking.js");
const users = require("./routes/user.js");
const admin = require("./routes/admin.js");
const listingRequests = require("./routes/listingRequest.js");
const User = require("./models/user.js");

const MONGO_URL = process.env.MONGO_URL;

main()
  .then(() => {
    console.log("connected to DB successfully");
  })
  .catch((err) => {
    console.log("DB connection error:", err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true })); // so that our URL get parsed
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const sessionOptions = {
  secret : process.env.SESSION_SECRET || "thisismysecretkey",
  resave : false,
  saveUninitialized : false,
  // store sessions in MongoDB so they survive server restarts
  store : MongoStore.create({
    mongoUrl : process.env.MONGO_URL,
    touchAfter : 24 * 60 * 60, // only update session once per 24 hours unless data changes
  }),
  cookie : {
    maxAge : 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    httpOnly : true,
  }
};

app.use(session(sessionOptions)); // this will create a session for each user
app.use(flash()); // this will create a flash message for each user

// initialize passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// use passport-local-mongoose's authenticate method as the local strategy
passport.use(new LocalStrategy(User.authenticate()));

// tell passport how to serialize and deserialize user into/from session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success"); // this will create a success message for each user
  res.locals.error = req.flash("error"); // this will create an error message for each user
  res.locals.currUser = req.user; // make current user available in all templates
  next();
});

// index route
app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.use("/listings", listings); // this will use the listing.js file for all the routes which starts with /listings
app.use("/listings/:id/review", reviews); // this will use the review.js file for all the routes which starts with /listings/:id/review
app.use("/listings/:id/booking", bookings); // this will use the booking.js file for all the routes which starts with /listings/:id/booking
app.use("/", users); // signup, login, logout routes
app.use("/admin", admin); // admin panel routes
app.use("/listing-requests", listingRequests); // user listing request routes




app.all("*", (req, res, next) => {
  // will execute when none of the above paths matched with it
  next(new ExpressError(404, "Page not found"));
});

app.use((err, req, res, next) => {
  // error handling middleware
  console.log(err.name);
  let { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).render("error.ejs", { message });
  // res.status(statusCode).send(message);
});

app.listen(port, () => {
  console.log(`app is listening to the port ${port}`);
});