import jwt from "jsonwebtoken";

export const generateAccessToken = (userId, organizationId) => {
    return jwt.sign(
        { userId, organizationId, type: "access" },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
    );
};

export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
    );
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
