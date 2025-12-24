import express from 'express';

const router = express.Router();

// In-memory logs for P0 (will be replaced with real logs later)
const LOGS = [
  { timestamp: new Date().toISOString(), level: 'info', message: 'Server started in P0 mode' }
];

// GET /api/logs
router.get('/', (req, res) => {
  res.json({
    ok: true,
    list: LOGS
  });
});

export default router;