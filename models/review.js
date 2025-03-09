const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  comment: {
    type: String,
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
});

const review = mongoose.model("review", reviewSchema);
module.exports = review;