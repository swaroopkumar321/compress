//app create
const express = require('express');
const app = express();
require("dotenv").config();

const PORT = process.env.PORT || 4000;

// Add CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

const fileupload=require("express-fileupload");
app.use(fileupload({
    useTempFiles: true,
    tempFileDir: "/tmp/"
}));

const db=require("./config/database");
db.connect();

const cloudinary=require("./config/cloudinary");
cloudinary.cloudinaryConnect();

const fileUploadRoutes=require("./routes/FileUpload");
app.use("/api/v1/upload", fileUploadRoutes);

// Test route to debug
app.get("/test", (req, res) => {
    res.json({ message: "Server is working!" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});