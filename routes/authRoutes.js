const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

// POST /auth/signup
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if email is already registered
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                error: "Email already registered"
            });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        // Return user information without the password
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
});


// POST /auth/signin
router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        // Compare submitted password with stored hash
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(400).json({
                error: "Invalid credentials"
            });
        }

        // Return basic user information without password
        res.status(200).json({
            message: "Sign in successful",
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
});

module.exports = router;