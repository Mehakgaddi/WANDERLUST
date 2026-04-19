const mongoose = require("mongoose");
const Listing = require("../models/listing.js"); // schema
const initData = require("./data.js"); // data
require("dotenv").config({ path: "../.env" });

const MONGO_URL = process.env.MONGO_URL;

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

const initDB = async () => {
  await Listing.deleteMany({});
  await Listing.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();
