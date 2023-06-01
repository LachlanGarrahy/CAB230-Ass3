const jwt = require('jsonwebtoken');
module.exports = function (req, res, next) {
    if (!("authorization" in req.headers)
        || !req.headers.authorization.match(/^Bearer /)
    ) {
        res.status(401).json({ error: true, message: "Authorization header ('Bearer token') not found" });
        return;
    }
    const token = req.headers.authorization.replace(/^Bearer /, "");

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Handle token verification errors
            return res.status(401).json({  error: true, message: "Invalid JWT token" });
        }

        // Check if the token has expired
        if (Date.now() >= decoded.bearer_exp * 1000) {
            return res.status(401).json({  error: true, message: "JWT token has expired" });
        }

        // Token is valid and not expired
        req.user = decoded; // Store the decoded token payload in the request object for future use
        next();
    });
};