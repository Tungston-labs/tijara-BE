const allowedOrigins = ["http://localhost:5173","http://178.248.112.16:82"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
  optionsSuccessStatus: 200,
};


module.exports = corsOptions;