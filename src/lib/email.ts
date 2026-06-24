import nodemailer from "nodemailer";
import type { DayStatusType } from "./agent";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password, not your account password
  },
});

const STATUS_META: Record<
  DayStatusType,
  { emoji: string; subject: (name: string) => string; badge: string; badgeColor: string }
> = {
  PROGRESSED: {
    emoji: "🔥",
    subject: (name) => `🔥 New problem solved, ${name}! Real progress today`,
    badge: "PROGRESSED",
    badgeColor: "#16a34a",
  },
  PRACTICED: {
    emoji: "💪",
    subject: (name) => `💪 ${name}, you're close — finish that new solve before midnight!`,
    badge: "PRACTICED",
    badgeColor: "#ca8a04",
  },
  INACTIVE: {
    emoji: "⏰",
    subject: (name) => `⏰ ${name}, LeetCode is waiting — day isn't over yet!`,
    badge: "INACTIVE",
    badgeColor: "#dc2626",
  },
};

export async function sendReminderEmail(
  to: string,
  name: string,
  body: string,
  status: DayStatusType,
) {
  const meta = STATUS_META[status];

  await transporter.sendMail({
    from: `"DailyLeetCode" <${process.env.EMAIL_USER}>`,
    to,
    subject: meta.subject(name),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <span style="font-size: 28px;">${meta.emoji}</span>
          <span style="font-size: 22px; font-weight: 700; color: #f97316;">DailyLeetCode</span>
          <span style="margin-left: auto; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${meta.badgeColor}22; color: ${meta.badgeColor}; border: 1px solid ${meta.badgeColor}44; letter-spacing: 0.05em;">
            ${meta.badge}
          </span>
        </div>

        <p style="font-size: 16px; line-height: 1.7; color: #cbd5e1; margin: 0 0 24px;">
          ${body.replace(/\n/g, "<br>")}
        </p>

        <a href="${process.env.NEXTAUTH_URL}/dashboard"
           style="display: inline-block; padding: 12px 28px; background: #f97316; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Open Dashboard →
        </a>

        <p style="margin-top: 28px; font-size: 12px; color: #475569; border-top: 1px solid #1e293b; padding-top: 16px;">
          You're receiving this because you're enrolled in DailyLeetCode.
          Visit your <a href="${process.env.NEXTAUTH_URL}/profile" style="color: #f97316;">profile</a> to manage settings.
        </p>
      </div>
    `,
  });
}
