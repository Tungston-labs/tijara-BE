const express = require("express");
const router = express.Router();
const { addAgent, deleteAgent, getAllAgents, getAgentById } = require("../../controllers/admin/agentController");
const jwtAuthentication = require("../../middleware/jwtAuthentication");
const userModels=require ("../../utils/userModals");

const verifyAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };

router.post("/add-agent",jwtAuthentication, verifyAdmin, addAgent);
router.delete("/delete-agent/:id",jwtAuthentication , verifyAdmin, deleteAgent);
router.get("/get-agents", jwtAuthentication, verifyAdmin, getAllAgents);
router.get("/get-agent/:id", jwtAuthentication, verifyAdmin, getAgentById);
module.exports = router;