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

// POST /auth/signup
router.post(
    "/signup",
    signupValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { name, email, password } = req.body;

            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res.status(400).json({
                    error: "Email already registered"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name,
                email,
                password: hashedPassword
            });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email
            });

        } catch (error) {
            res.status(400).json({
                error: error.message
            });
        }
    }
);

// POST /auth/signin
router.post(
    "/signin",
    signinValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({
                    error: "Invalid email or password"
                });
            }

            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(400).json({
                    error: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.cookie("token", token, {
                httpOnly: true
            });

            res.status(200).json({
                message: "Sign in successful",
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {
            res.status(400).json({
                error: error.message
            });
        }
    }
);

// POST /auth/logout
router.post("/logout", (req, res) => {
    res.clearCookie("token");

    res.status(200).json({
        message: "Logout successful"
    });
});

// GET /auth/me - Protected route
router.get("/me", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.status(200).json(user);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;