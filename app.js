const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const methodOverride = require("method-override");
const path = require("path");
const port = 8080;
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/expressError.js");
const {listingSchema, reviewSchema} = require("./schema.js");  // import only listingSchema from the entire schema object
const Review = require("./models/review.js");


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

// index route
app.get("/", (req, res) => {
  res.send("this is root path");
});

// middleware for schema validations
const validateListing = (req, res, next) => {
  let {error} = listingSchema.validate(req.body);
  if(error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  }
  else {
    next();
  }
}

const validateReview = (req, res, next) => {
  let {error} = reviewSchema.validate(req.body);
  if(error) {
    let errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  }
  else {
    next();
  }
}

app.get("/listings", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
}));

// crete new listing
app.get("/listings/new", (req, res) => {
  res.render("listings/new.ejs");
});

app.post("/listings", validateListing, wrapAsync(async(req, res) => {
  // let {title, description, image, price, location, country} = req.body;
  // here listing in req.body is an object which contains key-value pair
  // if(!req.body.listing) {   // problem is this will check for all the fields collectively but if we miss one of them it will not handle it instead it will save that  
  //   throw new ExpressError(400, "Send valid data for listing");
  // }
  let newListing = new Listing(req.body.listing); // make a new object give these values to the models listing
  // check for each fields by using tool joi(npm package) used for validation our schema
  // let result = listingSchema.validate(req.body);
  // if(result.error) {
  //   throw new ExpressError(400, result.error);  
  //   console.log(result);
  // }
  await newListing.save();
  console.log(newListing);
  res.redirect("/listings");
}));

// show route
app.get("/listings/:id", wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/show.ejs", { listing });
}));

// edit route
app.get("/listings/:id/edit", wrapAsync(async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", { listing });
}));

//update route
app.put("/listings/:id", validateListing, wrapAsync(async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true }); //...contains all the properties of listing
  res.redirect(`/listings/${id}`);
}));

// delete route

app.delete("/listings/:id", wrapAsync(async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  res.redirect("/listings");
})) ;

// reveiw route

// adding a review

app.post("/listings/:id/reviews", validateReview, wrapAsync(async (req, res) => {
  let listing = await Listing.findById(req.params.id);
  let review = new Review(req.body.review);

  listing.review.push(review);
  await review.save();
  await listing.save();
  console.log(review.comment);
  res.redirect(`/listings/${listing._id}`);
}));

// app.get("/testlisting", async (req, res) => {
//   let sampleListing = new Listing({
//     title: "My New Villa",
//     description: "By the beach",
//     price: 1200,
//     location: "Calangute Goa",
//     country: "India",
//   });

//   await sampleListing.save();
//   console.log("sample has been saved");
//   res.send("sample test listing");
// });


app.all("*", (req, res, next) => {  // will execute when none of the above paths matched with it
  next(new ExpressError(404, "Page not found"));
})

app.use((err, req, res, next) => {    // error handling middleware
  console.log(err.name);
  let {statusCode = 500, message="Something went wrong"} = err;
  res.status(statusCode).render("error.ejs", {message});
  // res.status(statusCode).send(message);
});

app.listen(port, () => {
  console.log(`app is listening to the port ${port}`);
});
