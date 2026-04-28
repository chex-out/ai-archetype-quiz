const ARCH_NAMES = { CY: 'Cyborg', CE: 'Centaur', DE: 'Delegator' };

const JOB_LABELS = {
  PM: 'Product Marketing',
  BC: 'Brand & Comms',
  CX: 'Customer Experience',
  DA: 'Business / Data Analytics',
  SO: 'Sales Operations',
  MO: 'Marketing Operations',
  RO: 'RevOps',
  CD: 'Campaigns / Demand Gen',
  DG: 'Deal Governance',
  SC: 'Sales Compensation',
  LM: 'Leadership / Management',
  AE: 'Admin & Executive Support',
  OT: 'Other',
};

const ROLE_MAPPINGS = {
  PM: 'Prompt Architect (messaging, positioning, competitive analysis)',
  BC: 'Domain Validator (brand voice, expression, reputation stakes)',
  CX: 'AI Translator and Agent Boss (customer-facing augmentation, journey mapping)',
  DA: 'Data Steward (insight generation, interpretation ownership)',
  SO: 'Workflow Engineer (pipeline, CRM, process accuracy)',
  MO: 'Workflow Engineer and Agent Boss (systems, automation, team leverage)',
  RO: 'Workflow Engineer and Agent Boss (connective tissue, cross-functional data)',
  CD: 'Prompt Architect and Workflow Engineer (volume, iteration, consistency)',
  DG: 'Domain Validator (risk, approval workflows, accuracy stakes)',
  SC: 'Domain Validator (modelling accuracy, dispute resolution)',
  LM: 'Agent Boss (AI strategy, team capability building, decision velocity)',
  AE: 'AI Translator (coordination, scheduling, communication efficiency)',
  OT: 'general marketing professional context',
};

const BCG_CONTEXT = {
  CY: 'Cyborg: 60% of workers in the BCG study. Highest rate of AI fluency development.',
  CE: 'Centaur: 14% of workers in the BCG study. Highest accuracy in human-AI collaboration.',
  DE: 'Delegator: 27% of workers in the BCG study. Most common starting point.',
};

function buildPrompt({ archScores, dominantArch, secondaryArch, jobFunction, jobFunctionFreeText }) {
  const dominantName = ARCH_NAMES[dominantArch];
  const dominantPct = Math.round((archScores[dominantArch] / 6) * 100);

  let secondaryLine = '';
  if (secondaryArch && archScores[secondaryArch] >= 2) {
    const secondaryName = ARCH_NAMES[secondaryArch];
    const secondaryPct = Math.round((archScores[secondaryArch] / 6) * 100);
    secondaryLine = `Secondary archetype: ${secondaryName} (${secondaryArch}), ${secondaryPct}% (score ${archScores[secondaryArch]}/6). Acknowledge this in the result where it adds nuance.`;
  }

  const jobLabel = JOB_LABELS[jobFunction] || 'Other';
  const roleMapping = ROLE_MAPPINGS[jobFunction] || ROLE_MAPPINGS.OT;
  const jobContext = jobFunction === 'OT' && jobFunctionFreeText
    ? `${jobLabel} — specifically: ${jobFunctionFreeText}`
    : jobLabel;

  return `You are generating a personalised archetype result for a participant in an AI worker style quiz run at FUJIFILM Business Innovation Singapore (FBSG), a B2B document solutions and IT services company serving Singapore SMEs. The audience is marketing professionals.

Participant data:
- Dominant archetype: ${dominantName} (${dominantArch}), ${dominantPct}% (score ${archScores[dominantArch]}/6)
- ${secondaryLine || 'No meaningful secondary archetype (secondary score below 2/6).'}
- Job function: ${jobContext}
- Role AI sub-archetype mapping: ${roleMapping}

BCG study context (use these exact figures if you reference statistics):
- ${BCG_CONTEXT.CY}
- ${BCG_CONTEXT.CE}
- ${BCG_CONTEXT.DE}

Writing guidelines:
- Write primarily to the dominant archetype. If a secondary archetype is provided, acknowledge it naturally where it adds nuance — do not ignore it.
- Tailor the role_paragraph specifically to how AI will change or amplify work in the stated job function, referencing the role AI sub-archetype mapping. Be concrete and forward-looking. Max 60 words.
- Tone: warm, direct, confident. No bravado. No hollow AI guru language. No em dashes. British English spelling.
- The word "archetype" should appear sparingly.
- Write description_p1 and description_p2 as continuous prose, not bullet points.

Return ONLY a valid JSON object with exactly these keys — no markdown, no explanation, no preamble:

{
  "tagline": "Punchy one-liner, max 12 words",
  "description_p1": "What makes this archetype distinctive and what their instinct is. Max 50 words. Warm and direct.",
  "description_p2": "How this plays out in a marketing context at a B2B tech company like FBSG. Max 50 words.",
  "role_paragraph": "A specific paragraph about how AI will change or amplify work in their stated job function, and where Agent Boss tendencies might emerge for that role. Max 60 words. Concrete and forward-looking.",
  "strength": "Their core superpower in one sentence, max 15 words",
  "watch_out": "One honest blind spot or growth edge, max 15 words",
  "traits": ["3 to 4 short trait labels, 2-3 words each"]
}`;
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

  const { archScores, dominantArch, secondaryArch, jobFunction, jobFunctionFreeText } = req.body || {};

  if (!archScores || !dominantArch || !jobFunction) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = buildPrompt({ archScores, dominantArch, secondaryArch, jobFunction, jobFunctionFreeText });

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
        max_tokens: 1000,
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

  return res.status(200).json(result);
};
