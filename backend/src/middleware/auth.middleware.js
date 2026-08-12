import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = verifyAccessToken(token);

            // Fetch the user to ensure they still exist and are active
            const user = await User.findById(decoded.userId).select("-password");

            if (!user) {
                return next(new AppError("User no longer exists", 401, ERROR_CODES.AUTH_REQUIRED));
            }

            if (user.status !== "active") {
                return next(new AppError("User account is not active", 401, ERROR_CODES.AUTH_REQUIRED));
            }

            req.user = user;
            return next();
        } catch (error) {
            return next(new AppError("Not authorized, token failed", 401, ERROR_CODES.INVALID_TOKEN));
        }
    }

    if (!token) {
        return next(new AppError("Not authorized, no token provided", 401, ERROR_CODES.AUTH_REQUIRED));
    }
};
