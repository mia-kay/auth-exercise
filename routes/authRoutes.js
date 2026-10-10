const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const authenticate = require("../middleware/authenticate");

const {
    signupValidation,
    signinValidation,
    handleValidationErrors
} = require("../validators/authValidators");

const router = express.Router();

router.post(
    "/signup",
    signupValidation,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const { name, email, password } = req.body;

            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "EMAIL_ALREADY_REGISTERED",
                        message: "This email is already registered."
                    }
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name,
                email,
                password: hashedPassword
            });

            return res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "EMAIL_ALREADY_REGISTERED",
                        message: "This email is already registered."
                    }
                });
            }

            return next(error);
        }
    }
);

router.post(
    "/signin",
    signinValidation,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: "INVALID_CREDENTIALS",
                        message: "Invalid email or password."
                    }
                });
            }

            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: "INVALID_CREDENTIALS",
                        message: "Invalid email or password."
                    }
                });
            }

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
            });

            return res.status(200).json({
                message: "Sign in successful",
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            return next(error);
        }
    }
);

router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    return res.status(200).json({
        message: "Logout successful"
    });
});

router.get("/me", authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "User not found."
                }
            });
        }

        return res.status(200).json(user);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;