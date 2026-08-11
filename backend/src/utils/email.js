// Stub for sending emails. In production, use SendGrid, AWS SES, Nodemailer, etc.

export const sendPasswordResetEmail = async (email, resetToken) => {
    console.log(`[EMAIL STUB] Sending password reset email to: ${email}`);
    console.log(`[EMAIL STUB] Reset Token (Simulated Link): https://your-frontend.com/reset-password?token=${resetToken}`);
    return true;
};
