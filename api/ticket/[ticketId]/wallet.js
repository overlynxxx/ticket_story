import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Генерация Apple Wallet pass файла
 * 
 * ВАЖНО: Для работы нужны:
 * 1. Apple Developer аккаунт
 * 2. Pass Type ID (например: pass.com.yourcompany.tickets)
 * 3. Сертификат для подписи (.p12 файл)
 * 4. Пароль от сертификата
 * 
 * Инструкция по настройке:
 * https://developer.apple.com/documentation/walletpasses
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { ticketId } = req.query;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        error: 'Ticket ID required'
      });
    }

    // Загружаем конфиг
    let eventsConfig = {};
    try {
      const configPath = join(process.cwd(), 'config', 'tickets.json');
      const configData = readFileSync(configPath, 'utf8');
      eventsConfig = JSON.parse(configData);
    } catch (error) {
      console.error('Ошибка загрузки конфига:', error);
    }

    // Парсим ticketId для получения данных
    // Формат: TICKET-timestamp-random-index
    const parts = ticketId.split('-');
    if (parts.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket ID format'
      });
    }

    // Получаем eventId и categoryId из query параметров или metadata
    const eventId = req.query.eventId;
    const categoryId = req.query.categoryId;

    if (!eventId || !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID and Category ID required'
      });
    }

    // Находим мероприятие и категорию
    const event = eventsConfig.events?.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const category = event.ticketCategories?.find(c => c.id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Создаем структуру pass файла
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || 'pass.com.ticketstory.event',
      serialNumber: ticketId,
      teamIdentifier: process.env.APPLE_TEAM_ID || 'YOUR_TEAM_ID',
      organizationName: process.env.APPLE_ORG_NAME || 'Ticket Story',
      description: event.name,
      logoText: 'Ticket',
      foregroundColor: 'rgb(0, 168, 255)',
      backgroundColor: 'rgb(10, 10, 10)',
      labelColor: 'rgb(255, 255, 255)',
      eventTicket: {
        primaryFields: [
          {
            key: 'event',
            label: 'Мероприятие',
            value: event.name
          }
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'Дата',
            value: event.date
          },
          {
            key: 'time',
            label: 'Время',
            value: event.time
          }
        ],
        auxiliaryFields: [
          {
            key: 'venue',
            label: 'Место',
            value: event.venue
          },
          {
            key: 'category',
            label: 'Категория',
            value: category.name
          }
        ],
        backFields: [
          {
            key: 'ticketId',
            label: 'ID билета',
            value: ticketId
          },
          {
            key: 'note',
            label: 'Примечание',
            value: 'Предъявите билет на входе. Билет действителен только для указанного мероприятия.'
          }
        ],
        barcode: {
          message: JSON.stringify({
            ticketId: ticketId,
            category: categoryId,
            event: event.name,
            eventId: event.id,
            date: event.date
          }),
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1'
        }
      }
    };

    // ВАЖНО: Для генерации подписанного .pkpass файла нужна библиотека
    // Например: passkit-generator, node-passbook или pkpass
    // 
    // Пример использования с passkit-generator:
    // const { PKPass } = require('passkit-generator');
    // const pass = new PKPass(passData, {
    //   model: './path/to/pass-template',
    //   certificates: {
    //     wwdr: './path/to/wwdr.pem',
    //     signerCert: './path/to/signerCert.pem',
    //     signerKey: './path/to/signerKey.pem',
    //     signerKeyPassphrase: process.env.APPLE_CERT_PASSWORD
    //   }
    // });
    // 
    // const buffer = pass.getAsBuffer();
    // res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    // res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketId}.pkpass"`);
    // res.send(buffer);

    // Пока возвращаем JSON с инструкциями
    // В продакшене здесь должен быть реальный .pkpass файл
    res.status(501).json({
      success: false,
      error: 'Apple Wallet pass generation not configured',
      message: 'Для работы Apple Wallet нужна настройка сертификатов Apple. См. инструкцию в коде.',
      passData: passData // Для отладки
    });

  } catch (error) {
    console.error('Ошибка генерации Apple Wallet pass:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка генерации pass файла'
    });
  }
}
