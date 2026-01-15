import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  // Устанавливаем заголовки для корректной работы из всех регионов
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const configPath = join(process.cwd(), 'config', 'tickets.json');
    const configData = readFileSync(configPath, 'utf8');
    const eventsConfig = JSON.parse(configData);

    res.status(200).json({
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
