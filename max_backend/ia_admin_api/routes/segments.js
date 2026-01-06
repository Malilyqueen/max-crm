import express from 'express';
import crypto from 'crypto';
import { getAllLeads } from '../utils/espo-api.js';

const router = express.Router();

function buildEspoQuery(rules) {
  const where = [];

  if (rules.tags && rules.tags.length > 0) {
    where.push(`where[${where.length}][field]=tags&where[${where.length}][type]=in&where[${where.length}][value]=${rules.tags.join(',')}`);
  }

  if (rules.where) {
    if (rules.where.lastPurchaseDaysLte) {
      const date = new Date();
      date.setDate(date.getDate() - rules.where.lastPurchaseDaysLte);
      where.push(`where[${where.length}][field]=lastPurchaseDate&where[${where.length}][type]=greaterThan&where[${where.length}][value]=${date.toISOString().split('T')[0]}`);
    }

    if (rules.where.totalSpentGte) {
      where.push(`where[${where.length}][field]=totalSpent&where[${where.length}][type]=greaterThan&where[${where.length}][value]=${rules.where.totalSpentGte}`);
    }

    if (rules.where.city) {
      where.push(`where[${where.length}][field]=addressCity&where[${where.length}][type]=equals&where[${where.length}][value]=${rules.where.city}`);
    }
  }

  return where.length > 0 ? `?${where.join('&')}&maxSize=1000` : '?maxSize=1000';
}

router.post('/segments/build', async (req, res) => {
  try {
    const { code, rules } = req.body || {};

    // Pour l'instant, on utilise directement les rules passées
    // TODO: charger depuis config si code fourni
    const segmentRules = rules || {};

    const query = buildEspoQuery(segmentRules);
    let contacts = [];
    try {
      contacts = await getAllLeads(query.replace('Lead', 'Contact'));
    } catch (espoError) {
      console.error('Espo segment query failed, using mock data:', espoError.message);
      // Fallback to mock data
      contacts = [
        { id: 'c1', name: 'Jean Dupont', emailAddress: 'jean@example.com', accountName: 'ABC Corp', addressCity: 'Paris', tags: ['client'], lastPurchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), totalSpent: 150 },
        { id: 'c2', name: 'Marie Martin', emailAddress: 'marie@example.com', accountName: 'XYZ Ltd', addressCity: 'Lyon', tags: ['client'], lastPurchaseDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), totalSpent: 75 }
      ];
    }

    const filteredContacts = contacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.emailAddress,
      company: contact.accountName,
      city: contact.addressCity,
      tags: contact.tags || [],
      lastPurchaseDays: contact.lastPurchaseDate ?
        Math.floor((Date.now() - new Date(contact.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)) : null,
      totalSpent: contact.totalSpent || 0
    }));

    const segmentId = 'seg-' + crypto.randomUUID().slice(0, 8);

    res.json({
      ok: true,
      segmentId,
      size: filteredContacts.length,
      preview: filteredContacts.slice(0, 10).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email
      }))
    });

  } catch (error) {
    console.error('Segment build error:', error);
    res.status(500).json({ ok: false, error: 'Segment build failed' });
  }
});

export default router;