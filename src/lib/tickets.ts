import { randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0, O, 1, I, L

export function generateTicketCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `FT-${code}`;
}

export async function generateQR(code: string): Promise<string> {
  const dir = join(process.cwd(), "public", "qr");
  await mkdir(dir, { recursive: true });

  const filename = `${code}.png`;
  const filepath = join(dir, filename);
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${code}`;

  await QRCode.toFile(filepath, url, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return `/qr/${filename}`;
}

export async function createTicketsForOrder(orderId: string): Promise<void> {
  const orderTickets = await db.query.tickets.findMany({
    where: eq(tickets.orderId, orderId),
  });

  for (const ticket of orderTickets) {
    const code = generateTicketCode();
    const qrUrl = await generateQR(code);

    await db
      .update(tickets)
      .set({ code, qrUrl, status: "valid" })
      .where(eq(tickets.id, ticket.id));
  }
}
