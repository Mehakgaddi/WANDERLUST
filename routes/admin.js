const express = require("express");
const router = express.Router();

const wrapAsync = require("../utils/wrapAsync.js");
const ListingRequest = require("../models/listingRequest.js");
const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const { isAdmin } = require("../utils/authMiddleware.js");

// admin dashboard - shows pending requests and stats
router.get(
  "/dashboard",
  isAdmin,
  wrapAsync(async (req, res) => {
    const pendingRequests = await ListingRequest.find({ status: "pending" })
      .populate("submittedBy")
      .sort({ createdAt: -1 });

    const totalListings = await Listing.countDocuments();
    const totalBookings = await Booking.countDocuments({ paymentStatus: "paid" });
    const totalRequests = await ListingRequest.countDocuments({ status: "pending" });

    res.render("admin/dashboard.ejs", {
      pendingRequests,
      totalListings,
      totalBookings,
      totalRequests,
    });
  })
);

// view all listing requests (all statuses)
router.get(
  "/requests",
  isAdmin,
  wrapAsync(async (req, res) => {
    const allRequests = await ListingRequest.find({})
      .populate("submittedBy")
      .sort({ createdAt: -1 });
    res.render("admin/requests.ejs", { allRequests });
  })
);

// approve a listing request - creates a real listing from it
router.post(
  "/requests/:requestId/approve",
  isAdmin,
  wrapAsync(async (req, res) => {
    const request = await ListingRequest.findById(req.params.requestId);
    if (!request) {
      req.flash("error", "Request not found!");
      return res.redirect("/admin/dashboard");
    }

    // create a new listing from the approved request
    const newListing = new Listing({
      title: request.title,
      description: request.description,
      image: request.image,
      price: request.price,
      location: request.location,
      country: request.country,
    });

    await newListing.save();

    // mark request as approved
    request.status = "approved";
    await request.save();

    req.flash("success", `Listing "${request.title}" approved and added to all listings!`);
    res.redirect("/admin/dashboard");
  })
);

// reject a listing request
router.post(
  "/requests/:requestId/reject",
  isAdmin,
  wrapAsync(async (req, res) => {
    const request = await ListingRequest.findById(req.params.requestId);
    if (!request) {
      req.flash("error", "Request not found!");
      return res.redirect("/admin/dashboard");
    }

    request.status = "rejected";
    await request.save();

    req.flash("success", `Listing request "${request.title}" has been rejected.`);
    res.redirect("/admin/dashboard");
  })
);

// view all bookings across all listings - admin only
router.get(
  "/bookings",
  isAdmin,
  wrapAsync(async (req, res) => {
    const allBookings = await Booking.find({ paymentStatus: "paid" })
      .populate("listing")
      .sort({ createdAt: -1 });
    res.render("admin/bookings.ejs", { allBookings });
  })
);

module.exports = router;
