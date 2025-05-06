const express = require("express");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const port = 8080;
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/expressError.js");
const session = require("express-session");
const flash = require("connect-flash");

const listings = require("./routes/listing.js");
const reviews = require("./routes/review.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("connecting to DB");
  })
  .catch((err) => {
    console.log(err);
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
  secret : "thisismysecretkey",
  resave :false,
  saveUninitialized : true,
  cookie : {
    expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge : 7 * 24 * 60 * 60 * 1000,
    httpOnly : true,
  }
};

// index route
app.get("/", (req, res) => {
  res.send("this is root path");
});

app.use(session(sessionOptions)); // this will create a session for each user
app.use(flash()); // this will create a flash message for each user

app.use((req, res, next) => {
  res.locals.success = req.flash("success"); // this will create a success message for each user
  res.locals.error = req.flash("error"); // this will create an error message for each user
  next();
});

app.use("/listings", listings); // this will use the listing.js file for all the routes which starts with /listings
app.use("/listings/:id/review", reviews); // this will use the review.js file for all the routes which starts with /listings/:id/review




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