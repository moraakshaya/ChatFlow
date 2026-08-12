import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

// Use debug level in development, info in production
const level = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

const logger = pino({
    level,
    // Add timestamp formatted as ISO string
    timestamp: pino.stdTimeFunctions.isoTime,
    // Format output if in development mode
    ...(isDevelopment && {
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname"
            }
        }
    })
});

export default logger;
