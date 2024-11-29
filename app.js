const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const port = 8080;

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

app.get("/", (req, res) => {
  res.send("this is root path");
});

app.get("/testlisting", async (req, res) => {
  let sampleListing = new Listing({
    title: "My New Villa",
    description: "By the beach",
    price: 1200,
    location: "Calangute Goa",
    country: "India",
  });

  await sampleListing.save();
  console.log("sample has been saved");
  res.send("sample test listing");
});

app.listen(port, () => {
  console.log(`app is listening to the port ${port}`);
});
