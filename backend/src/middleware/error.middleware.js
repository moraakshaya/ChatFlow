const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `Duplicate field value entered: ${field}. Please use another value!`;
        statusCode = 409;
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map((val) => val.message);
        message = `Validation Error: ${errors.join(", ")}`;
        statusCode = 400;
    }

    // Mongoose bad ObjectId
    if (err.name === "CastError") {
        message = `Resource not found with id of ${err.value}`;
        statusCode = 404;
    }

    res.status(statusCode).json({
        success: false,
        message: message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};

export default errorHandler;
