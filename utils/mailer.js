const nodemailer = require("nodemailer");

// create reusable transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,   // your gmail address
    pass: process.env.GMAIL_PASS,   // your gmail app password (not your real password)
  },
});

// send email to admin when a user submits a listing request
module.exports.sendListingRequestEmail = async (request, submittedByUsername) => {
  const mailOptions = {
    from: `"WanderLust" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER, // admin email (same gmail)
    subject: `New Listing Request from ${submittedByUsername}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        
        <div style="background-color: #fe424d; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">WanderLust</h2>
          <p style="color: white; margin: 5px 0 0;">New Listing Request</p>
        </div>

        <div style="padding: 24px;">
          <p>Hi Admin,</p>
          <p>A user has submitted a new listing request that needs your review.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Submitted By</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${submittedByUsername}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Title</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${request.title}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Location</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${request.location}, ${request.country}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Price</td>
              <td style="padding: 10px; border: 1px solid #ddd;">₹${request.price}/night</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Description</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${request.description}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.APP_URL}/admin/dashboard" 
               style="background-color: #fe424d; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 16px;">
              Review on Admin Panel
            </a>
          </div>

          <p style="margin-top: 24px; color: #888; font-size: 13px;">
            This is an automated email from WanderLust. Please do not reply to this email.
          </p>
        </div>

      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
