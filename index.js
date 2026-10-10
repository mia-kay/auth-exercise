require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

let databaseConnected = false;

function log(level, message, details = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...details
    }));
}

app.use(cors({
    origin: [
        "https://auth-frontend-self-pi.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());

app.get("/health", (req, res) => {
    const healthy =
        databaseConnected &&
        mongoose.connection.readyState === 1;

    res.status(healthy ? 200 : 503).json({
        success: healthy,
        status: healthy ? "healthy" : "unavailable",
        database: healthy ? "connected" : "disconnected"
    });
});

app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            error: {
                code: "SERVICE_UNAVAILABLE",
                message: "The service is temporarily unavailable. Please try again later."
            }
        });
    }

    next();
});

app.use("/auth", authRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: "NOT_FOUND",
            message: "The requested resource was not found."
        }
    });
});

app.use((error, req, res, next) => {
    log("error", "Request failed", {
        method: req.method,
        path: req.path,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack
    });

    if (res.headersSent) {
        return next(error);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: {
            code: error.code || "INTERNAL_SERVER_ERROR",
            message:
                error.statusCode && error.statusCode < 500
                    ? error.message
                    : "An unexpected error occurred. Please try again later."
        }
    });
});

mongoose.connection.on("connected", () => {
    databaseConnected = true;
    log("info", "MongoDB connected");
});

mongoose.connection.on("disconnected", () => {
    databaseConnected = false;
    log("warn", "MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
    databaseConnected = true;
    log("info", "MongoDB reconnected");
});

mongoose.connection.on("error", (error) => {
    log("error", "MongoDB connection error", {
        errorName: error.name,
        errorMessage: error.message
    });
});

async function startServer() {
    try {
        if (!process.env.MONGO_URI_DIRECT) {
            throw new Error("MONGO_URI_DIRECT is not configured");
        }

        await mongoose.connect(process.env.MONGO_URI_DIRECT, {
            family: 4,
            serverSelectionTimeoutMS: 10000
        });

        databaseConnected = true;

        app.listen(PORT, () => {
            log("info", "Server started", {
                port: PORT
            });
        });
    } catch (error) {
        log("fatal", "Server startup failed", {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack
        });

        process.exitCode = 1;
    }
}

startServer();