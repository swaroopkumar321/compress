const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

require("dotenv").config();

const fileSchema = new mongoose.Schema({
    Name:{
        type:String,
        required: true,
    },
    imageUrl: {
        type: String,
    },
    tags:{
        type: String,
    },
    email:{
        type: String,
        required: true,
    }
});
//post
fileSchema.post("save", async function(doc) {
    try{
        console.log("DOC:", doc);
        console.log("Attempting to send email to:", doc.email);
        console.log("SMTP host:", process.env.MAIL_HOST);
        console.log("SMTP user:", process.env.MAIL_USER);

        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            }
        });

        let mailOptions = {
            from: `CodeHelp <${process.env.MAIL_USER}>`,
            to: doc.email,
            subject: "New File Uploaded on cloudinary",
            html: `<h2>Hello</h2><p>File Name: ${doc.Name}</p>`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Error sending email:", err);
            } else {
                console.log("Message sent: %s", info.messageId);
                console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
            }
        });
    }
    catch(error){
        console.error("Catch block error:", error);
    }
});
const File = mongoose.model("File", fileSchema);
module.exports = File;