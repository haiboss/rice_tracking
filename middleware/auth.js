const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const token =
    req.cookies.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    console.error("Token not found in cookies or headers");
    return res.redirect("/login");
  }

  jwt.verify(token, "Vnpt#@123456!", (err, user) => {
    if (err) {
      console.error("Token verification failed:", err);
      return res.redirect("/login");
    }

    req.user = user;
    next();
  });
}
function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      return next();
    }
    res.status(403).send("Access denied");
  };
}
module.exports = { authenticateToken, authorizeRole };
