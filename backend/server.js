// server.js
import express from "express";
import soilRoutes from "./routes/soilRoutes.js"; // note file name
import cors from "cors";

const app = express();

// add json body parsing if you want to accept POSTs later
app.use(express.json());
app.use(cors());

// mount API
app.use("/api", soilRoutes);

// prevent 404 at root (simple health message)
//app.get("/", (req, res) => res.send("API running. Use /api/soil"));

// start server
app.listen(5000, () => console.log("Server running on port 5000"));
