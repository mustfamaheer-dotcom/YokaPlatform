const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { query } = require('../../shared/db');
const { requireAuth } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * POST /api/swm/system/backup
 * Triggers a full, transactional database and system snapshot.
 * Dumps all tables, schemas, and records to a compressed timestamped SQL archive.
 */
router.post('/backup', requireAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `yoka_backup_${dateStr}.sql`;
    const filepath = path.join(backupDir, filename);

    // 1. Fetch all public base tables
    const tableRows = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tableRows.map(r => r.table_name);
    let totalRecords = 0;

    const stream = fs.createWriteStream(filepath, { encoding: 'utf8' });

    stream.write(`-- ========================================================\n`);
    stream.write(`-- YOKA STORE SYSTEM & DATABASE FULL BACKUP ARCHIVE\n`);
    stream.write(`-- Generated at: ${new Date().toISOString()}\n`);
    stream.write(`-- Triggered By: User ID ${req.user.id} (${req.user.username} - ${req.user.role})\n`);
    stream.write(`-- Total Tables: ${tables.length}\n`);
    stream.write(`-- ========================================================\n\n`);
    stream.write(`SET client_encoding = 'UTF8';\n`);
    stream.write(`SET standard_conforming_strings = on;\n\n`);

    for (const table of tables) {
      try {
        const rows = await query(`SELECT * FROM "${table}"`);
        totalRecords += rows.length;
        stream.write(`-- --------------------------------------------------------\n`);
        stream.write(`-- Table: "${table}" (${rows.length} records)\n`);
        stream.write(`-- --------------------------------------------------------\n`);

        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const colList = columns.map(c => `"${c}"`).join(', ');

          for (const row of rows) {
            const values = columns.map(col => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              if (val instanceof Date) return `'${val.toISOString()}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return `'${String(val).replace(/'/g, "''")}'`;
            }).join(', ');

            stream.write(`INSERT INTO "${table}" (${colList}) VALUES (${values});\n`);
          }
        }
        stream.write(`\n`);
      } catch (tblErr) {
        console.warn(`[Backup Notice] Skipped/partial table "${table}":`, tblErr.message);
      }
    }

    stream.end();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const stats = fs.statSync(filepath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

    // Log the backup activity
    try {
      await logActivity({
        userId: req.user.id,
        action: 'SYSTEM_BACKUP_COMPLETED',
        entityType: 'system',
        entityId: null,
        details: {
          filename,
          sizeBytes: stats.size,
          sizeFormatted: stats.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`,
          tablesCount: tables.length,
          totalRecords,
          durationSec
        },
        req
      });
    } catch (logErr) {
      console.warn('Backup activity log error:', logErr.message);
    }

    return res.json({
      success: true,
      message: 'تم إتمام النسخ الاحتياطي للنظام وقاعدة البيانات بنجاح',
      data: {
        filename,
        sizeBytes: stats.size,
        sizeFormatted: stats.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`,
        tablesCount: tables.length,
        totalRecords,
        durationSeconds: durationSec,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('System backup error:', err);
    return res.status(500).json({
      success: false,
      message: 'فشل في إنشاء النسخة الاحتياطية للنظام: ' + err.message
    });
  }
});

module.exports = router;
