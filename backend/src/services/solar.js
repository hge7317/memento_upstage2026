const SOLAR_API_KEY = process.env.SOLAR_API_KEY;
const SOLAR_BASE_URL = "https://api.upstage.ai/v1";
const SOLAR_MODEL = "solar-pro4";

// Solar Pro 4 호출
export async function callSolar(messages, maxTokens = 1024) {
  if (!SOLAR_API_KEY) {
    throw new Error("SOLAR_API_KEY not set");
  }

  const response = await fetch(`${SOLAR_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SOLAR_API_KEY}`,
    },
    body: JSON.stringify({
      model: SOLAR_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Solar API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty Solar response");
  return content;
}
