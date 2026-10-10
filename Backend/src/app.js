const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const fs = require("fs")
const path = require("path")


const dns = require("dns");
// importing dns module to set custom DNS servers
dns.setServers(["1.1.1.1", "8.8.8.8"]);



const app = express()

app.use(express.json())
app.use(cookieParser())


const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "https://gen-ai-interviewer.vercel.app"
].filter(Boolean)

app.use(cors({
    origin: allowedOrigins,
    credentials: true
} ))

// app.use(cors({
//     origin: "http://localhost:5173",
//     credentials: true
// }))



/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")



/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

const frontendDistPath = path.resolve(__dirname, "../../Frontend/dist")
const frontendIndexPath = path.join(frontendDistPath, "index.html")

if (fs.existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath))
    app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
        res.sendFile(frontendIndexPath)
    })
}

// Global error handler — without this, failures return with no useful
// message, which is why this exact 400 has been impossible to diagnose
// from the browser alone. Now the real reason will show up in both the
// Network tab response body AND the Render logs.
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err)
    res.status(err.status || err.statusCode || 500).json({
        message: err.message || "Something went wrong on the server."
    })
})

module.exports = app