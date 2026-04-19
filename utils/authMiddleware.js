// middleware to check if user is logged in
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    // save the url the user was trying to visit so we can redirect after login
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in to do that!");
    return res.redirect("/login");
  }
  next();
};

// middleware to pass redirectUrl from session to res.locals
// (passport clears session on login, so we save it in locals first)
module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

// middleware to check if logged in user is admin
module.exports.isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in to do that!");
    return res.redirect("/login");
  }
  if (!req.user.isAdmin) {
    req.flash("error", "You do not have permission to do that!");
    return res.redirect("/listings");
  }
  next();
};
