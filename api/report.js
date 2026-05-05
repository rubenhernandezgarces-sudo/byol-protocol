export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { entries, goals } = req.body;
  if (!entries || !entries.length) return res.status(400).json({ error: 'No entries provided' });

  const summary = entries.slice(-14).map(e =>
    `${e.date}: ${e.calories}kcal P:${e.protein}g C:${e.carbs}g G:${e.fat}g`
  ).join('\n');

  const prompt = `Eres nutricionista. Datos últimos 14 días:\n${summary}\nMetas diarias: ${goals.calories}kcal, ${goals.protein}g proteína, ${goals.carbs}g carbs, ${goals.fat}g grasa.\nReporte conciso en español: tendencias, logros, 3 recomendaciones concretas. Máximo 120 palabras.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error('Claude API error');
    const data = await response.json();
    return res.status(200).json({ report: data.content[0].text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
