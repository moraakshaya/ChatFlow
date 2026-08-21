import jwt from "jsonwebtoken";
import User from "../../models/User.js";

/**
 * Socket.IO Middleware to authenticate connections.
 * It expects a JWT token to be provided in the handshake auth object.
 */
export const verifySocketToken = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication error: Token missing"));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Fetch user from DB to ensure they still exist and are active
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return next(new Error("Authentication error: User not found"));
        }

        // Attach user to socket object
        socket.user = user;
        next();
    } catch (error) {
        return next(new Error("Authentication error: Invalid token"));
    }
};
