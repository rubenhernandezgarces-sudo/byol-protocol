export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mimeType } = req.body;
  if (!image || !mimeType) return res.status(400).json({ error: 'Missing image or mimeType' });

  const prompt = `Analyze food image. Respond ONLY with valid JSON, no markdown, no explanation:
{"meal":"food name","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"confidence":"low|medium|high","notes":"one sentence"}
Estimate realistic home portions. All numbers integers. Calories in kcal, rest in grams.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Claude API error: ' + err });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return res.status(200).json(JSON.parse(match[0]));
      return res.status(500).json({ error: 'Could not parse AI response' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
