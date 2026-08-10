"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { contactSchema, fieldErrors } from "@/lib/validation";
import type { ContactState } from "@/lib/form-state";
import { checkLimit, retryAfterMessage } from "@/lib/rate-limit";
import { clientIp } from "@/lib/utils";

export async function submitContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const headerBag = await headers();
  const ip = clientIp(headerBag) ?? "unknown";

  const limit = checkLimit("contact", ip);
  if (!limit.ok) return { ok: false, message: retryAfterMessage(limit) };

  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;

  // Honeypot: the field is hidden from real users, so anything in it is a bot.
  // Return the success state so the bot has no signal to adapt to.
  if (data.website) {
    return { ok: true, message: "Thank you — we will be in touch shortly." };
  }

  await prisma.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
      investmentRange: data.investmentRange || null,
      source: headerBag.get("referer")?.slice(0, 200) ?? null,
      ip,
    },
  });

  return {
    ok: true,
    message:
      "Thank you — your message is with the investment team. We reply within one business day.",
  };
}
