export type DayStatusType = "PROGRESSED" | "PRACTICED" | "INACTIVE";

export interface StudentContext {
  name: string;
  streak: number;
  totalSolved: number;
  ranking: number | null;
  classRank: number;
  classSize: number;
  status: DayStatusType;
  topStudentSolved: number;
}

const STATUS_CONTEXT: Record<DayStatusType, string> = {
  PROGRESSED:
    "They solved a NEW unique problem today — real, verifiable progress made. totalSolved went up.",
  PRACTICED:
    "They submitted attempts today but did NOT add a new unique solve. They showed up and tried but need one more push to actually finish a new problem.",
  INACTIVE:
    "They have NOT touched LeetCode at all today. No submissions whatsoever.",
};

const STATUS_INSTRUCTION: Record<DayStatusType, string> = {
  PROGRESSED:
    "Celebrate the genuine progress — they solved something new, not just attempted it. Encourage maintaining the streak.",
  PRACTICED:
    "Acknowledge they showed up and tried — that counts for something. But push them to close out a new unique solve before midnight. Progress = new problems, not just attempts.",
  INACTIVE:
    "They haven't started yet. Remind them the day isn't over. Even 30 focused minutes can mean a new solve. Be encouraging, not guilt-trippy.",
};

const FALLBACK_MESSAGE = "Every problem you solve is a step forward — keep going!";

function buildPrompt(ctx: StudentContext): string {
  return `You are a friendly, motivating coding coach for a class of ${ctx.classSize} students solving LeetCode problems daily.

Student info:
- Name: ${ctx.name}
- Current streak: ${ctx.streak} days
- Total problems solved (unique): ${ctx.totalSolved}
- LeetCode global ranking: ${ctx.ranking ? `#${ctx.ranking.toLocaleString()}` : "unranked"}
- Class rank: #${ctx.classRank} out of ${ctx.classSize}
- Top student in class has solved: ${ctx.topStudentSolved} unique problems
- Today's status: ${STATUS_CONTEXT[ctx.status]}

Write a short, personal, energetic reminder email body (3-5 sentences).
Instruction: ${STATUS_INSTRUCTION[ctx.status]}

Rules:
- Be specific to their stats (use their name, numbers, rank)
- No subject line, no greeting, no sign-off — just the body text
- End with one punchy motivating sentence`;
}

async function callAnthropic(prompt: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : null;
}

async function callOpenRouter(prompt: string): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

export async function generateReminderMessage(ctx: StudentContext): Promise<string> {
  const prompt = buildPrompt(ctx);

  // Try Anthropic first, fall back to OpenRouter
  try {
    const result = await callAnthropic(prompt);
    if (result) return result;
  } catch {}

  try {
    const result = await callOpenRouter(prompt);
    if (result) return result;
  } catch {}

  return FALLBACK_MESSAGE;
}
