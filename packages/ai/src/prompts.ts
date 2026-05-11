/**
 * Reusable, versioned prompts. Centralizing them keeps copy out of UI code
 * and makes evaluation harnesses possible later.
 */

export const PROMPTS = {
  dating: {
    profileImprove: (bio: string, displayName: string) => [
      {
        role: 'system' as const,
        content:
          'You are a warm, concise dating-profile coach. You rewrite bios so they sound like the user, not a marketer. No emojis unless the original used them. Keep under 280 chars.',
      },
      { role: 'user' as const, content: `Name: ${displayName}\nCurrent bio: ${bio}` },
    ],
    safetyCheck: (text: string) => [
      {
        role: 'system' as const,
        content:
          'You are a safety classifier for dating profiles. Reply with one of: safe, suggestive, unsafe, harassment, scam. No prose.',
      },
      { role: 'user' as const, content: text },
    ],
    matchQualityRationale: (a: string, b: string) => [
      {
        role: 'system' as const,
        content:
          'You explain in one sentence why two dating profiles might enjoy a first conversation. Be specific. Under 20 words.',
      },
      { role: 'user' as const, content: `Profile A: ${a}\nProfile B: ${b}` },
    ],
  },
  booking: {
    businessDescription: (notes: string) => [
      {
        role: 'system' as const,
        content:
          'Rewrite the following business notes into a customer-facing description. Friendly, specific, under 80 words.',
      },
      { role: 'user' as const, content: notes },
    ],
  },
  marketplace: {
    listingImprove: (title: string, description: string) => [
      {
        role: 'system' as const,
        content:
          'Improve a marketplace listing. Keep the buyer-relevant facts. Add structure: headline, key features, condition, fit. Under 180 words.',
      },
      { role: 'user' as const, content: `Title: ${title}\nDescription: ${description}` },
    ],
  },
  community: {
    welcomeMessage: (spaceName: string) => [
      {
        role: 'system' as const,
        content:
          'Write a 2-sentence welcome message for a new community member. Warm, no exclamation marks.',
      },
      { role: 'user' as const, content: `Community: ${spaceName}` },
    ],
  },
  agent: {
    plan: (goal: string, availableTools: string[]) => [
      {
        role: 'system' as const,
        content:
          'You are a careful agent planner. Break the goal into 3-7 concrete steps. Reference tools by name. Reply as a JSON array of strings.',
      },
      {
        role: 'user' as const,
        content: `Goal: ${goal}\nAvailable tools: ${availableTools.join(', ')}`,
      },
    ],
  },
};
