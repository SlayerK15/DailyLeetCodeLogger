const LEETCODE_API = "https://leetcode.com/graphql";

interface LeetCodeUserStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  ranking: number | null;
  contributionPoints: number;
  totalSubmissions: number;
}

const USER_STATS_QUERY = `
  query userStats($username: String!) {
    matchedUser(username: $username) {
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
      contributions {
        points
      }
      profile {
        ranking
        reputation
      }
    }
  }
`;

export async function fetchLeetCodeStats(
  username: string
): Promise<LeetCodeUserStats | null> {
  try {
    const res = await fetch(LEETCODE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
      },
      body: JSON.stringify({
        query: USER_STATS_QUERY,
        variables: { username },
      }),
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const user = data?.data?.matchedUser;
    if (!user) return null;

    const acSubmissions: Array<{ difficulty: string; count: number; submissions: number }> =
      user.submitStats?.acSubmissionNum ?? [];

    const getCount = (difficulty: string) =>
      acSubmissions.find((s) => s.difficulty === difficulty)?.count ?? 0;

    const getSubmissions = (difficulty: string) =>
      acSubmissions.find((s) => s.difficulty === difficulty)?.submissions ?? 0;

    const totalSolved = getCount("All");
    const easySolved = getCount("Easy");
    const mediumSolved = getCount("Medium");
    const hardSolved = getCount("Hard");
    const totalSubmissions = getSubmissions("All");
    const acceptanceRate =
      totalSubmissions > 0 ? (totalSolved / totalSubmissions) * 100 : 0;

    return {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      acceptanceRate: parseFloat(acceptanceRate.toFixed(1)),
      ranking: user.profile?.ranking ?? null,
      contributionPoints: user.contributions?.points ?? 0,
      totalSubmissions,
    };
  } catch {
    return null;
  }
}

export async function verifyLeetCodeUsername(username: string): Promise<boolean> {
  const stats = await fetchLeetCodeStats(username);
  return stats !== null;
}
