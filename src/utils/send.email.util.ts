import { Resend } from "resend";
import Mailgen from "mailgen";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const mailGenerator = new Mailgen({
      theme: "default",
      product: {
        name: "JoblandsAI",
        link: process.env.FRONTEND_URL!,
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

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject,
      html,
    });

    console.log(process.env.RESEND_API_KEY);

    console.log("Resend response:", response);

    console.log(`Email sent successfully to ${email}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Email delivery failed");
  }
};
