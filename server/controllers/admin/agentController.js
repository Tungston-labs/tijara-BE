// controllers/admin/agentController.js
const Agent = require("../../models/Agent");

const addAgent = async (req, res,next) => {
  try {
    const { agentName, email, phone, address } = req.body;

    if (!agentName || !email || !phone || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Agent.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Agent with this email or phone already exists" });
    }

    const newAgent = new Agent({ agentName, email, phone, address });
    await newAgent.save();

    res
      .status(201)
      .json({ message: "Agent added successfully", agent: newAgent });
  } catch (error) {
    next(error)
  }
};

const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAgent = await Agent.findByIdAndDelete(id);
    if (!deletedAgent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    res.status(200).json({ message: "Agent deleted successfully" });
  } catch (error) {
    next(error)
  }
};
const getAllAgents = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {
      $or: [
        { agentName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ],
    };

    const total = await Agent.countDocuments(query);

    const agents = await Agent.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      pageSize: agents.length,
      agents,
    });
  } catch (error) {
    next(error);
  }
};


const getAgentById = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.status(200).json(agent);
  } catch (error) {
    next(error);
  }
};

module.exports = { addAgent, deleteAgent, getAllAgents, getAgentById };
