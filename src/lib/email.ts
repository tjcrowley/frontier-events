import sgMail from "@sendgrid/mail";

// Only set API key if it looks real — allows dev to run without SendGrid configured
if (process.env.SENDGRID_API_KEY?.startsWith("SG.")) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface TicketInfo {
  attendeeName: string;
  ticketTypeName: string;
  code: string;
  qrUrl: string;
}

interface OrderEmailParams {
  order: { id: string };
  tickets: TicketInfo[];
  contact: { email: string; firstName: string; lastName: string };
  event: {
    name: string;
    date: Date;
    endDate?: Date | null;
    location: string;
    slug: string;
  };
}

function buildGoogleCalendarUrl(event: OrderEmailParams["event"]): string {
  const start = formatCalDate(new Date(event.date));
  const end = event.endDate
    ? formatCalDate(new Date(event.endDate))
    : formatCalDate(new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000));

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${start}/${end}`,
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatCalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatEventDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function sendOrderConfirmation({
  order,
  tickets,
  contact,
  event,
}: OrderEmailParams): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const calendarUrl = buildGoogleCalendarUrl(event);

  const ticketRows = tickets
    .map(
      (t) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${t.attendeeName}</strong><br>
          <span style="color: #666;">${t.ticketTypeName}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          <code style="font-size: 16px; font-weight: bold; color: #1a1a1a;">${t.code}</code>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          <img src="${appUrl}${t.qrUrl}" alt="QR Code ${t.code}" width="120" height="120" />
        </td>
      </tr>`
    )
    .join("");

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a;">
      <div style="background: #1a1a1a; padding: 24px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 20px;">Frontier Events</h1>
      </div>

      <div style="padding: 32px 24px;">
        <h2 style="margin: 0 0 8px;">You're in!</h2>
        <p style="color: #666; margin: 0 0 24px;">Your tickets for <strong>${event.name}</strong> are confirmed.</p>

        <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px;"><strong>${event.name}</strong></p>
          <p style="margin: 0 0 4px; color: #666;">${formatEventDate(new Date(event.date))}</p>
          <p style="margin: 0 0 12px; color: #666;">${event.location}</p>
          <a href="${calendarUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 14px;">
            Add to Google Calendar
          </a>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #1a1a1a;">
              <th style="padding: 8px 12px; text-align: left;">Attendee</th>
              <th style="padding: 8px 12px; text-align: center;">Code</th>
              <th style="padding: 8px 12px; text-align: center;">QR</th>
            </tr>
          </thead>
          <tbody>
            ${ticketRows}
          </tbody>
        </table>

        <div style="margin-top: 32px; text-align: center;">
          <a href="${appUrl}/orders/${order.id}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            View Order
          </a>
        </div>
      </div>

      <div style="background: #f8f8f8; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
        <p style="margin: 0;">Frontier Tower Makerspace</p>
      </div>
    </div>
  `;

  if (!process.env.SENDGRID_API_KEY?.startsWith("SG.")) {
    console.log(`[email stub] Would send order confirmation to ${contact.email} for ${event.name}`);
    return;
  }
  await sgMail.send({
    from: process.env.SENDGRID_FROM_EMAIL || "events@frontiertower.io",
    to: contact.email,
    subject: `Your tickets for ${event.name}`,
    html,
  });
}

export async function sendEventMessage(params: {
  recipients: { email: string; firstName?: string | null }[];
  event: { title: string; slug: string };
  message: { subject: string; body: string };
}): Promise<void> {
  if (!process.env.SENDGRID_API_KEY?.startsWith("SG.")) {
    console.log(`[email stub] Would send "${params.message.subject}" to ${params.recipients.length} recipients for event "${params.event.title}"`);
    params.recipients.forEach(r => console.log(`  -> ${r.email}`));
    return;
  }
  const from = process.env.SENDGRID_FROM_EMAIL || "events@frontiertower.io";
  for (const recipient of params.recipients) {
    const greeting = recipient.firstName ? `Hi ${recipient.firstName},` : "Hi,";
    await sgMail.send({
      from,
      to: recipient.email,
      subject: params.message.subject,
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:-apple-system,sans-serif;color:#1a1a1a;">
          <div style="background:#0A0A0A;padding:20px;text-align:center;">
            <h2 style="color:#fff;margin:0;font-size:18px;">${params.event.title}</h2>
          </div>
          <div style="padding:28px 24px;">
            <p>${greeting}</p>
            ${params.message.body.split("\n").map(p => `<p>${p}</p>`).join("")}
          </div>
          <div style="background:#f5f5f5;padding:12px 24px;font-size:12px;color:#999;text-align:center;">
            You are receiving this because you RSVPd or have a ticket to ${params.event.title}.
          </div>
        </div>
      `,
    });
  }
}

export async function sendWaitlistNotification(params: {
  email: string;
  firstName?: string | null;
  event: { title: string; slug: string; startsAt: Date };
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  if (!process.env.SENDGRID_API_KEY?.startsWith("SG.")) {
    console.log(`[email stub] Waitlist notification -> ${params.email} for ${params.event.title}`);
    return;
  }
  const greeting = params.firstName ? `Hi ${params.firstName},` : "Hi,";
  await sgMail.send({
    from: process.env.SENDGRID_FROM_EMAIL || "events@frontiertower.io",
    to: params.email,
    subject: `A spot opened up: ${params.event.title}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
        <div style="background:#0A0A0A;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Frontier Events</h1>
        </div>
        <div style="padding:32px 24px;">
          <p>${greeting}</p>
          <p>A spot just opened up for <strong>${params.event.title}</strong>.</p>
          <p><a href="${appUrl}/e/${params.event.slug}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Register now</a></p>
          <p style="color:#666;font-size:14px;">Spots are first come, first served.</p>
        </div>
      </div>
    `,
  });
}

export async function sendNewsletterWelcome(
  email: string,
  firstName: string
): Promise<void> {
  if (!process.env.SENDGRID_API_KEY?.startsWith("SG.")) {
    console.log(`[email stub] Would send newsletter welcome to ${email}`);
    return;
  }
  await sgMail.send({
    from: process.env.SENDGRID_FROM_EMAIL || "events@frontiertower.io",
    to: email,
    subject: "Welcome to Frontier Events!",
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
        <div style="background:#0A0A0A;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Frontier Events</h1>
        </div>
        <div style="padding:32px 24px;">
          <h2>Hey ${firstName}! 👋</h2>
          <p>You're now subscribed to Frontier Tower event updates. We'll let you know when new events are posted.</p>
          <p style="color:#666;font-size:14px;">You can unsubscribe anytime from your account settings.</p>
        </div>
      </div>
    `,
  });
}
