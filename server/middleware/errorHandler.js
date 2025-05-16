const errorHandler = (err, req, res, next) => {
    // Make sure err is always an object
    if (!err) err = new Error("Unknown error");
  
    console.error(err.stack || err.message || err);
  
    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  
    res.status(statusCode).json({
      message: err.message || "Something went wrong",
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  };
  
  module.exports = errorHandler;
  