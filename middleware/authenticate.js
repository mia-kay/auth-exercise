const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
const token = req.cookies?.token;

```
if (!token) {
    return res.status(401).json({
        success: false,
        error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Please sign in to access this resource."
        }
    });
}

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
} catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            error: {
                code: "INVALID_TOKEN",
                message: "Your session is invalid or has expired. Please sign in again."
            }
        });
    }

    next(error);
}
```

};

module.exports = authenticate;
