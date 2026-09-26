import nodemailer from "nodemailer";

const isConfigured = () => Boolean(
  process.env.SMTP_HOST && process.env.SMTP_FROM,
);

export const sendAccountEmail = async ({ to, subject, text, html }) => {
  if (!isConfigured()) {
    console.warn("Account email was not sent because SMTP_HOST and SMTP_FROM are not configured.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text, html });
  return true;
};
