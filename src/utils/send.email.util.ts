import nodemailer from "nodemailer";
import Mailgen from "mailgen";
import dotenv from "dotenv";

dotenv.config();

interface MailAction {
  instructions: string;
  button: {
    text: string;
    link: string;
  };
}

export const sendEmail = async (
  email: string,
  name: string,
  intro: string,
  subject: string,
  action?: MailAction
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });

    const mailGenerator = new Mailgen({
      theme: "default",
      product: {
        name: "JoblandsAI",
        link: `${process.env.FRONTEND_URL}`,
      },
    });
    const emailContent = {
      body: {
        name,
        intro,
        action,
        outro: "Have a great time finding your career breakthrough.",
      },
    };
    const html = mailGenerator.generate(emailContent);
    const message = {
      from: process.env.EMAIL,
      to: email,
      subject,
      html,
    };

    await transporter.sendMail(message);

    console.log(`Sign-up email sent successfully to ${email}`);
  } catch (error) {
    console.error("Failed to send sign-up email:", error);
  }
};
