const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const token = req.cookies.token;

    // Check if token exists in cookie
    if (!token) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Attach decoded payload to req.user
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
};

module.exports = authenticate;