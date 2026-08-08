const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
        return res.status(401).json({
            error: "Authorization header required"
        });
    }

    // Check that it uses Bearer format
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            error: "Invalid authorization format"
        });
    }

    const token = parts[1];

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