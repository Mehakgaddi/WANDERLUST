const express = require("express");
const router = express.Router({ mergeParams: true }); // this will merge the params of the parent route with the child route
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/expressError.js");
const { listingSchema } = require("../schema.js"); // import only listingSchema from the entire schema object
const Listing = require("../models/listing.js");

// middleware for schema validations
const validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// create new listing
router.get("/new", (req, res) => {
  res.render("listings/new.ejs");
});

router.get(
  "/",
  wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  })
);

// edit route
router.get(
  "/:id/edit",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }
    res.render("listings/edit.ejs", { listing });
  })
);

//update route
router.put(
  "/:id",
  validateListing,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true }); //...contains all the properties of listing
    req.flash("success", "Listing Updated Successfully!");
    res.redirect(`/listings/${id}`);
  })
);

// show route - display individual listing
router.get(
  "/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate("review");
    // populate will get the data from the review collection and add it to the listing collection
    // listing.review will give the id of the review collection and populate will get the data from the review collection and add it to the listing collection
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
  })
);

router.post(
  "/",
  validateListing,
  wrapAsync(async (req, res) => {
    // if (!req.body.listing.image) {
    //     delete req.body.listing.image;
    //   }
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
    req.flash("success", "New listing created successfully!");
    console.log(newListing);
    res.redirect("/listings");
  })
);

// delete route

router.delete(
  "/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted Successfully!");
    res.redirect("/listings");
  })
);

module.exports = router;
