const express = require("express");
const router = express.Router({ mergeParams: true }); // merges :id from parent route

const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/expressError.js");
const { bookingSchema } = require("../schema.js");
const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { isLoggedIn } = require("../utils/authMiddleware.js");

// initialize razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// middleware for booking schema validation
const validateBooking = (req, res, next) => {
  let { error } = bookingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// show booking form for a listing
router.get(
  "/new",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }
    res.render("bookings/new.ejs", { listing, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
  })
);

// create razorpay order and save pending booking
router.post(
  "/",
  isLoggedIn,
  validateBooking,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    let { guestName, guestEmail, checkIn, checkOut, guests } = req.body.booking;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // calculate number of nights
    const nights = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    );

    if (nights <= 0) {
      req.flash("error", "Check-out date must be after check-in date!");
      return res.redirect(`/listings/${id}/booking/new`);
    }

    // check if the same user (by email) already has an overlapping booking for this listing
    const conflictingBooking = await Booking.findOne({
      listing: id,
      guestEmail: guestEmail,
      paymentStatus: { $in: ["pending", "paid"] },
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } },
      ],
    });

    if (conflictingBooking) {
      req.flash(
        "error",
        "You already have a booking for this listing on the selected dates!"
      );
      return res.redirect(`/listings/${id}/booking/new`);
    }

    // check if any other user has already booked the same dates (seat conflict)
    const seatConflict = await Booking.findOne({
      listing: id,
      paymentStatus: "paid",
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } },
      ],
    });

    if (seatConflict) {
      req.flash(
        "error",
        "Sorry, this listing is already booked for the selected dates. Please choose different dates!"
      );
      return res.redirect(`/listings/${id}/booking/new`);
    }

    const totalAmount = listing.price * nights;

    // if razorpay keys are not configured, use mock payment flow
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "your_razorpay_key_id_here") {
      // save booking as paid directly (mock mode)
      const newBooking = new Booking({
        listing: id,
        guestName,
        guestEmail,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        totalAmount,
        orderId: `mock_order_${Date.now()}`,
        paymentId: `mock_pay_${Date.now()}`,
        paymentStatus: "paid",
      });

      await newBooking.save();

      // fetch the saved booking with listing populated
      const populatedBooking = await Booking.findById(newBooking._id).populate("listing");

      req.flash("success", "Booking confirmed! (Mock payment - add Razorpay keys for real payments)");
      return res.render("bookings/confirmation.ejs", { booking: populatedBooking });
    }

    // create razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    // save booking with pending status
    const newBooking = new Booking({
      listing: id,
      guestName,
      guestEmail,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalAmount,
      orderId: razorpayOrder.id,
      paymentStatus: "pending",
    });

    await newBooking.save();

    res.render("bookings/payment.ejs", {
      listing,
      booking: newBooking,
      razorpayOrder,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      nights,
    });
  })
);

// verify razorpay payment and confirm booking
router.post(
  "/verify-payment",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } =
      req.body;

    // verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      // mark booking as failed
      await Booking.findByIdAndUpdate(bookingId, { paymentStatus: "failed" });
      req.flash("error", "Payment verification failed! Please try again.");
      return res.redirect(`/listings/${id}/booking/new`);
    }

    // update booking to paid
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        paymentId: razorpay_payment_id,
        paymentStatus: "paid",
      },
      { new: true }
    ).populate("listing");

    req.flash("success", "Booking confirmed! Payment successful.");
    res.render("bookings/confirmation.ejs", { booking });
  })
);

// show bookings - admin sees all, user sees only their own
router.get(
  "/",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    let bookings;
    if (req.user.isAdmin) {
      // admin sees all paid bookings for this listing
      bookings = await Booking.find({ listing: id, paymentStatus: "paid" }).sort({ checkIn: 1 });
    } else {
      // user sees only their own bookings for this listing
      bookings = await Booking.find({
        listing: id,
        guestEmail: req.user.email,
        paymentStatus: "paid",
      }).sort({ checkIn: 1 });
    }

    res.render("bookings/index.ejs", { listing, bookings });
  })
);

module.exports = router;
