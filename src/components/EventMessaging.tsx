"use client";

import { useState, useEffect } from "react";

interface MessageRecord {
  id: string;
  subject: string;
  body: string;
  recipientFilter: string;
  recipientCount: number | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

interface Props {
  eventId: string;
  initialMessages: MessageRecord[];
}

export function EventMessaging({ eventId, initialMessages }: Props) {
  const [messages, setMessages] = useState<MessageRecord[]>(initialMessages);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    fetchRecipientCount(recipientFilter);
  }, [recipientFilter, eventId]);

  async function fetchRecipientCount(filter: string) {
    setLoadingCount(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/messages/count?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setRecipientCount(data.count);
      }
    } catch {
      // ignore
    }
    setLoadingCount(false);
  }

  async function handleSend() {
    setSending(true);
    setStatus(null);

    try {
      // Create draft
      const draftRes = await fetch(`/api/admin/events/${eventId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, recipientFilter }),
      });

      if (!draftRes.ok) {
        setStatus({ type: "error", message: "Failed to create message" });
        setSending(false);
        return;
      }

      const draft = await draftRes.json();

      // Send it
      const sendRes = await fetch(`/api/admin/events/${eventId}/messages/${draft.id}/send`, {
        method: "POST",
      });

      if (sendRes.ok) {
        const result = await sendRes.json();
        setStatus({ type: "success", message: `Message sent to ${result.recipientCount} people` });
        setSubject("");
        setBody("");
        setShowConfirm(false);

        // Refresh messages
        const listRes = await fetch(`/api/admin/events/${eventId}/messages`);
        if (listRes.ok) {
          setMessages(await listRes.json());
        }
      } else {
        setStatus({ type: "error", message: "Failed to send message" });
      }
    } catch {
      setStatus({ type: "error", message: "Something went wrong" });
    }

    setSending(false);
  }

  const filterLabels: Record<string, string> = {
    all: "All RSVPs & Ticket Holders",
    going: "Going only",
    tickets_only: "Ticket holders only",
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold">Event Messages</h2>

      {/* Past messages */}
      {messages.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="pb-2 pr-4">Subject</th>
                <th className="pb-2 pr-4">Filter</th>
                <th className="pb-2 pr-4">Recipients</th>
                <th className="pb-2">Sent</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className="border-b border-slate-800">
                  <td className="py-2 pr-4 text-white">{msg.subject}</td>
                  <td className="py-2 pr-4 text-slate-400">{filterLabels[msg.recipientFilter] ?? msg.recipientFilter}</td>
                  <td className="py-2 pr-4 text-slate-400">{msg.recipientCount ?? "—"}</td>
                  <td className="py-2 text-slate-400">
                    {msg.sentAt
                      ? new Date(msg.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                      : msg.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compose form */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-4">
        <p className="font-medium text-white">Compose Message</p>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Message subject..."
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Write your message..."
          />
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">Recipients</label>
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All RSVPs &amp; Ticket Holders</option>
              <option value="going">Going only</option>
              <option value="tickets_only">Ticket holders only</option>
            </select>
          </div>
          <div className="text-sm text-slate-400 pb-2">
            {loadingCount ? "..." : recipientCount !== null ? `${recipientCount} people` : ""}
          </div>
        </div>

        {status && (
          <p className={`text-sm ${status.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {status.message}
          </p>
        )}

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!subject || !body || sending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            Send Message
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">
              Send to {recipientCount ?? "?"} people?
            </span>
            <button
              onClick={handleSend}
              disabled={sending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {sending ? "Sending..." : "Confirm"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
