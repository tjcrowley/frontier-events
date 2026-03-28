import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      event: true,
      contact: true,
      tickets: {
        with: { ticketType: true },
      },
    },
  });

  if (!order) notFound();

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            &larr; Frontier Events
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-white">You&apos;re all set!</h1>
          <p className="text-slate-400 mt-1">
            Your tickets for <strong className="text-white">{order.event.title}</strong> are
            confirmed.
          </p>
        </div>

        {/* Event Details */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5 mb-6">
          <h2 className="font-semibold text-white mb-3">{order.event.title}</h2>
          <div className="space-y-1 text-sm text-slate-300">
            <p>📅 {formatDate(order.event.startsAt)}</p>
            {order.event.location && <p>📍 {order.event.location}</p>}
          </div>
        </div>

        {/* Tickets */}
        <h2 className="text-lg font-semibold mb-4">
          Your Tickets ({order.tickets.length})
        </h2>
        <div className="space-y-4">
          {order.tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-lg border border-slate-700 bg-slate-800/50 p-5 print:border-gray-300 print:bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white print:text-black">
                    {ticket.attendeeName}
                  </p>
                  <p className="text-sm text-slate-400 print:text-gray-500">
                    {ticket.ticketType.name}
                  </p>
                  <p className="mt-2 font-mono text-lg font-bold text-indigo-400 print:text-indigo-600">
                    {ticket.code}
                  </p>
                </div>
                {ticket.qrUrl && (
                  <div className="shrink-0">
                    <img
                      src={ticket.qrUrl}
                      alt={`QR code for ${ticket.code}`}
                      className="w-24 h-24 rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-3 justify-center print:hidden">
          <Link
            href={`/e/${order.event.slug}`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            View Event
          </Link>
        </div>
      </main>
    </div>
  );
}
