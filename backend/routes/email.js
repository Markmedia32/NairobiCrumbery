import { Resend } from "resend";

const EMAIL_FROM = process.env.EMAIL_FROM || "Nairobi Crumbery <orders@nairobicrumbery.co.ke>";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "nairobicrumbery@gmail.com";

const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY is missing — emails will fail to send.");
} else {
  console.log("✓ Resend configured — sending from", EMAIL_FROM);
}

export { resend, EMAIL_FROM, OWNER_EMAIL };

// Fire-and-forget send, matching the old queueEmail() pattern — callers don't need to await this.
export function queueEmail(message) {
  const payload = {
    from: EMAIL_FROM,
    reply_to: OWNER_EMAIL, // orders@nairobicrumbery.co.ke has no MX record — replies must land in Gmail
    ...message,
  };

  resend.emails
    .send(payload)
    .then(({ error }) => {
      if (error) {
        console.error("Background email failed:", error.message);
      }
    })
    .catch((error) => {
      console.error("Background email failed:", error.message);
    });
}