import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const configPath = join(process.cwd(), 'config', 'tickets.json');
    const configData = readFileSync(configPath, 'utf8');
    const eventsConfig = JSON.parse(configData);

    res.json({
      success: true,
      events: eventsConfig.events || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
