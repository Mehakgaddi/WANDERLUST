// run this once to create the admin account: node seedAdmin.js
// admin credentials are set in .env file

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user.js");

const MONGO_URL = process.env.MONGO_URL;

async function seedAdmin() {
  await mongoose.connect(MONGO_URL);
  console.log("connected to DB");

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminUsername || !adminPassword || !adminEmail) {
    console.log("Please set ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL in .env file");
    process.exit(1);
  }

  // check if admin already exists
  const existing = await User.findOne({ username: adminUsername });
  if (existing) {
    console.log("Admin account already exists!");
    process.exit(0);
  }

  const adminUser = new User({ username: adminUsername, email: adminEmail, isAdmin: true });
  await User.register(adminUser, adminPassword);

  console.log(`Admin account created! Username: ${adminUsername}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.log(err);
  process.exit(1);
});
