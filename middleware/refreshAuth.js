const jwt = require('jsonwebtoken');
module.exports = function (req, res, next) {
    if (req.body.refreshToken === null) {
        res.status(400).json({ error: true, message: "Request body incomplete, refresh token required" });
        return;
    }
    const token = req.body.refreshToken;

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            // Handle token verification errors
            return res.status(401).json({  error: true, message: "Invalid JWT token" });
        }

        // Check if the token has expired
        if (Date.now() >= decoded.refresh_exp * 1000) {
            return res.status(401).json({  error: true, message: "JWT token has expired" });
        }

        const user_refresh = await req.db.from("users").select("refresh").where("email", "=", decoded.email);

        if (user_refresh[0].refresh !== token) {
            return res.status(401).json({  error: true, message: "JWT token has expired" });
        }

        // Token is valid and not expired
        req.user = decoded; // Store the decoded token payload in the request object for future use
        next();
    });
};