const jwt = require('jsonwebtoken');
module.exports = function (req, res, next) {
    if (!("authorization" in req.headers) || !req.headers.authorization.match(/^Bearer /)) { 
        req.isAuthorised = false; 
        return next();
    }

    const token = req.headers.authorization.replace(/^Bearer /, "");

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Handle token verification errors
            req.isAuthorised = false; 
            return next();
        }

        // Check if the token has expired
        if (Date.now() >= decoded.bearer_exp * 1000) {
            req.isAuthorised = false; 
            return next();
        }

        // Token is valid and not expired
        req.user = decoded; // Store the decoded token payload in the request object for future use
        req.isAuthorised = true;
        next();
    });
};