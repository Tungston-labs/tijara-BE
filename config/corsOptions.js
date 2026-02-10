const allowedOrigins = [
  "http://localhost:5173",
  "https://admin.thijara.me",
  "https://thijara.me"
];

const corsOptions = {
  origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With"
  ],

  credentials: true,
  optionsSuccessStatus: 204,
};

module.exports = corsOptions;
