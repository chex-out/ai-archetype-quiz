const ARCH_NAMES = { CY: 'Cyborg', CE: 'Centaur', DE: 'Delegator' };

function buildPrompt({ archScores, dominantArch, secondaryArch, roleText }) {
  const dominantName = ARCH_NAMES[dominantArch];
  const dominantPct  = Math.round((archScores[dominantArch] / 6) * 100);

  let secondaryLine = '';
  if (secondaryArch && archScores[secondaryArch] >= 2) {
    const secondaryName = ARCH_NAMES[secondaryArch];
    const secondaryPct  = Math.round((archScores[secondaryArch] / 6) * 100);
    secondaryLine = `They also have a secondary lean toward ${secondaryName} (${secondaryPct}%). Acknowledge this in the paragraph where it adds genuine nuance — do not force it in.`;
  }

  const roleContext = roleText
    ? `Their role or job function: ${roleText}`
    : 'Their role was not provided — write a broadly applicable paragraph.';

  return `You are generating a single personalised paragraph for someone who has just completed an AI working style quiz.

Their result:
- Dominant working style: ${dominantName} (${dominantPct}% of their answers)
${secondaryLine ? '- ' + secondaryLine : '- No significant secondary style.'}
- ${roleContext}

Background on the three working styles, from BCG research:
- Cyborg (60% of workers): integrates AI throughout their work as a thinking partner; highest rate of AI fluency development
- Centaur (14% of workers): makes deliberate divisions between what they handle and what AI handles; highest accuracy
- Delegator (27% of workers): uses AI primarily for efficiency and offloading tasks; most common starting point

Write a role_paragraph (max 60 words) that is specific to how AI will change or amplify work in their stated role, given their working style. Be concrete and forward-looking. Do not mention the style name (Cyborg, Centaur, Delegator) explicitly. Write in second person. British English. No em dashes.

Return ONLY a valid JSON object with exactly this key — no markdown, no explanation:
{"role_paragraph": "..."}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { archScores, dominantArch, secondaryArch, roleText } = req.body || {};

  if (!archScores || !dominantArch) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = buildPrompt({ archScores, dominantArch, secondaryArch, roleText });

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    console.error('Fetch to Anthropic failed:', err);
    return res.status(502).json({ error: 'Failed to reach AI service' });
  }

  if (!response.ok) {
    const body = await response.text();
    console.error('Anthropic API error:', response.status, body);
    return res.status(502).json({ error: 'AI service returned an error' });
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error('Failed to parse Anthropic response:', err);
    return res.status(502).json({ error: 'Unexpected response from AI service' });
  }

  const rawText = data?.content?.[0]?.text || '';

  let result;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch (err) {
    console.error('Failed to parse JSON from model output:', rawText);
    return res.status(502).json({ error: 'Could not parse result' });
  }

  return res.status(200).json({ role_paragraph: result.role_paragraph || null });
};
