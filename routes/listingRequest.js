const express = require("express");
const router = express.Router();

const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/expressError.js");
const ListingRequest = require("../models/listingRequest.js");
const { isLoggedIn } = require("../utils/authMiddleware.js");
const { sendListingRequestEmail } = require("../utils/mailer.js");

// show form to submit a listing request
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listingRequests/new.ejs");
});

// handle listing request form submission
router.post(
  "/",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { title, description, image, price, location, country } = req.body.listingRequest;

    const newRequest = new ListingRequest({
      title,
      description,
      image,
      price,
      location,
      country,
      submittedBy: req.user._id,
      status: "pending",
    });

    await newRequest.save();

    // send email notification to admin
    try {
      await sendListingRequestEmail(newRequest, req.user.username);
    } catch (emailErr) {
      // do not block the user if email fails, just log it
      console.log("Email notification failed:", emailErr.message);
    }

    req.flash("success", "Your listing request has been submitted! Admin will review it shortly.");
    res.redirect("/listings");
  })
);

// show user's own submitted requests
router.get(
  "/my-requests",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const requests = await ListingRequest.find({ submittedBy: req.user._id }).sort({ createdAt: -1 });
    res.render("listingRequests/myRequests.ejs", { requests });
  })
);

module.exports = router;
