import nodemailer from "nodemailer";

function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function getMailerConfig() {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = Number(process.env.EMAIL_SMTP_PORT || 587);
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO || from;
  const secure = parseBoolean(process.env.EMAIL_SMTP_SECURE, port === 465);

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      "Email service is not configured. Please set EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASS, and EMAIL_FROM."
    );
  }

  return { host, port, user, pass, from, replyTo, secure };
}

function createTransporter() {
  const config = getMailerConfig();

  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }),
    config,
  };
}

export async function sendOrderConfirmationEmail({
  to,
  customerName,
  receipt,
  invoiceNumber,
  totalAmount,
  invoicePdf,
}: {
  to: string;
  customerName: string;
  receipt: string;
  invoiceNumber: string;
  totalAmount: number;
  invoicePdf: Uint8Array;
}) {
  const { transporter, config } = createTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    replyTo: config.replyTo,
    subject: `CrazyAudios Order Confirmation - ${receipt}`,
    text: [
      `Hello ${customerName},`,
      "",
      "Thank you for your order with CrazyAudios.",
      `Your payment was received successfully for order ${receipt}.`,
      `Invoice Number: ${invoiceNumber}`,
      `Total Paid: Rs ${totalAmount}`,
      "",
      "We have attached your invoice PDF to this email.",
      "",
      "Regards,",
      "CrazyAudios",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Order Confirmed</h2>
        <p>Hello ${customerName},</p>
        <p>Thank you for your order with <strong>CrazyAudios</strong>.</p>
        <p>Your payment was received successfully for order <strong>${receipt}</strong>.</p>
        <p>
          <strong>Invoice Number:</strong> ${invoiceNumber}<br />
          <strong>Total Paid:</strong> Rs ${totalAmount}
        </p>
        <p>We have attached your invoice PDF to this email for your records.</p>
        <p>Regards,<br />CrazyAudios</p>
      </div>
    `,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: Buffer.from(invoicePdf),
        contentType: "application/pdf",
      },
    ],
  });
}
