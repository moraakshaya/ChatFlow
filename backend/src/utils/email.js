import logger from "./logger.js";

// Stub for sending emails. In production, use SendGrid, AWS SES, Nodemailer, etc.

export const sendPasswordResetEmail = async (email, resetToken) => {
    logger.info({ event: "email.sent", type: "password_reset", email }, "[EMAIL STUB] Sending password reset email");
    
    // Print a prominent block in the console so the user can easily see and click the link
    console.log(`\n======================================================`);
    console.log(`✉️  DUMMY EMAIL SENT TO: ${email}`);
    console.log(`======================================================`);
    console.log(`Subject: Reset your password`);
    console.log(`Click the link below to reset your password:`);
    console.log(`👉  http://localhost:5173/reset-password?token=${resetToken}`);
    console.log(`======================================================\n`);
    
    return true;
};
