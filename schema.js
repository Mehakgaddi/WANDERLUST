//using joi for server side validations checks for each field differently instead of using if condition for
//each field differently

const Joi = require("joi");

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    location: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().required().min(0),
    country: Joi.string().required(),
    image: Joi.string().allow("", null),
  }).required(),
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    comment: Joi.string().required(),
  }).required(),
});

module.exports.bookingSchema = Joi.object({
  booking: Joi.object({
    guestName: Joi.string().required(),
    guestEmail: Joi.string().email({ tlds: { allow: false } }).required(),
    checkIn: Joi.date().greater("now").required(),
    checkOut: Joi.date().greater(Joi.ref("checkIn")).required(),
    guests: Joi.number().integer().min(1).required(),
  }).required(),
});

module.exports.userSchema = Joi.object({
  user: Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().required(),
  }).required(),
});
