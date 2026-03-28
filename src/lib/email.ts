import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

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

  await sgMail.send({
    from: process.env.SENDGRID_FROM_EMAIL || "events@frontiertower.io",
    to: contact.email,
    subject: `Your tickets for ${event.name}`,
    html,
  });
}

export async function sendNewsletterWelcome(
  email: string,
  firstName: string
): Promise<void> {
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
