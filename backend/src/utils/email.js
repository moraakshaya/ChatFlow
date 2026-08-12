import logger from "./logger.js";

// Stub for sending emails. In production, use SendGrid, AWS SES, Nodemailer, etc.

export const sendPasswordResetEmail = async (email, resetToken) => {
    logger.info({ event: "email.sent", type: "password_reset", email }, "[EMAIL STUB] Sending password reset email");
    logger.info({ event: "email.link", resetToken }, `[EMAIL STUB] Reset Token (Simulated Link): https://your-frontend.com/reset-password?token=${resetToken}`);
    return true;
};
