import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { maxDuration: 30 };

const MAILERLITE_GROUP_ID = '185917251382150276';
const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/FgaFLGYrbGZSBVprTkhR/webhook-trigger/elWtYyahvdVemgjf2SBn';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, score, maxScore } = req.body as {
    name: string;
    email: string;
    score: number;
    maxScore: number;
  };

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const scorePercentage = Math.round((score / maxScore) * 100);
  const tier = scorePercentage > 75 ? 'Leader' : scorePercentage > 40 ? 'Adopter' : 'Explorer';

  const [mlResult, ghlResult] = await Promise.allSettled([
    // MailerLite — add subscriber to AI Assessment Leads group
    fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        fields: { name },
        groups: [MAILERLITE_GROUP_ID],
        status: 'active',
      }),
    }),

    // GHL — create/update contact in CRM
    fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        customFields: {
          aiReadinessScore: score,
          maxScore,
          scorePercentage,
          tier,
          assessmentDate: new Date().toISOString(),
        },
        tags: ['AI Assessment Completed', `AI Tier: ${tier}`],
      }),
    }),
  ]);

  const mlOk = mlResult.status === 'fulfilled' && (mlResult.value.ok || mlResult.value.status === 409);
  const ghlOk = ghlResult.status === 'fulfilled' && ghlResult.value.ok;

  if (!mlOk) console.error('MailerLite error:', mlResult);
  if (!ghlOk) console.error('GHL error:', ghlResult);

  // Always return success to the user — don't block report unlock on 3rd-party failures
  return res.status(200).json({ success: true, mailerlite: mlOk, ghl: ghlOk });
}
