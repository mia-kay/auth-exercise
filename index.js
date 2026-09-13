require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const cookieParser = require("cookie-parser");


const app = express();
app.use(cors({
    origin: "http://localhost:5174",
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRoutes);  

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI_DIRECT, {
    family: 4
})
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error);
    });

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});