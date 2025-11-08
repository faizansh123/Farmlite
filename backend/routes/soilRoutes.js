// routes/soilRoutes.js
import express from "express";
// import { getSoilData } from "../controllers/soilControllers.js";
import { createPolygon } from "../controllers/soilController.js";
import { getPolygonData } from "../controllers/soilController.js";
import { getSoilData } from "../controllers/soilController.js";

const router = express.Router();
// router.get("/soil", getSoilData);
router.post("/soil/polygon", createPolygon);
router.get("/soil/polygon/:polyid", getPolygonData);
router.get("/soil/:polyid", getSoilData);

export default router;
