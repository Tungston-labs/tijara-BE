// controllers/admin/agentController.js
const Agent = require("../../models/Agent");
const User = require("../../models/User");

const validator = require("validator");

const addAgent = async (req, res, next) => {
  try {
    const { agentName, email, phone, address } = req.body;

    if (!agentName || !email || !phone || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!validator.isMobilePhone(phone, "en-IN")) {
      return res.status(400).json({ message: "Invalid phone number" });
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
    next(error);
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

const editAgent = async (req, res) => {
  const { id } = req.params; // agent id from URL param
  const { agentName, email, phone, address } = req.body; // fields to update

  try {
    // Find agent by id and update, returning the updated document
    const updatedAgent = await Agent.findByIdAndUpdate(
      id,
      { agentName, email, phone, address },
      { new: true, runValidators: true }
    );

    if (!updatedAgent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    res.status(200).json({ message: "Agent updated successfully", agent: updatedAgent });
  } catch (error) {
    // Handle duplicate key errors (e.g., email or phone unique constraint)
    if (error.code === 11000) {
      const duplicateKey = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${duplicateKey} already exists` });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const assignAgentToUser = async (req, res) => {
  try {
    const { userId, agentId } = req.body;

    // Validate user and agent exist
    const user = await User.findById(userId);
    const agent = await Agent.findById(agentId);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot assign agent to admin' });
    }

    user.assignedAgent = agent._id;
    await user.save();

    res.status(200).json({
      message: `Agent assigned to ${user.role} successfully`,
      data: {
        userId: user._id,
        role: user.role,
        assignedAgent: agent.name, // or agent._id
      },
    });
  } catch (err) {
    console.error('Error assigning agent:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { addAgent, deleteAgent, getAllAgents, getAgentById, editAgent ,assignAgentToUser};
