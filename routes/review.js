const express = require("express");
const router = express.Router({ mergeParams : true }); // this will merge the params of the parent route with the child route

const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/expressError.js");
const { reviewSchema } = require("../schema.js"); // import only listingSchema from the entire schema object
const Review = require("../models/review.js");
const Listing = require("../models/listing.js");
const { isLoggedIn } = require("../utils/authMiddleware.js");

const validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
      let errMsg = error.details.map((el) => el.message).join(", ");
      throw new ExpressError(400, errMsg);
    } else {
      next();
    }
  };

// reveiw route

// adding a review to a listing
router.post(
  "/",
  isLoggedIn,
  validateReview,
  wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);

    // save the logged in user as the author of the review
    newReview.author = req.user._id;

    listing.review.push(newReview._id);
    await newReview.save();
    await listing.save();
    req.flash("success", "New review added!");
    console.log(newReview.comment);
    res.redirect(`/listings/${listing._id}`);
  })
);


// delete review route
router.delete(
  "/:reviewId",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      req.flash("error", "Review not found!");
      return res.redirect(`/listings/${id}`);
    }

    // only the review author or admin can delete
    if (!review.author.equals(req.user._id) && !req.user.isAdmin) {
      req.flash("error", "You do not have permission to delete this review!");
      return res.redirect(`/listings/${id}`);
    }

    await Listing.findByIdAndUpdate(id, { $pull: { review: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review deleted!");
    res.redirect(`/listings/${id}`);
  })
);

module.exports = router;