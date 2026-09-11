const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectDir = path.join(UPLOADS_DIR, `project_${req.params.projectId}`);
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

const router = express.Router();

// POST /api/files/project/:projectId — Upload file to project
router.post('/project/:projectId', authenticate, upload.single('file'), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const user = req.user;
  if (user.role === 'sales' && project.salesperson_id !== user.id) return res.status(403).json({ error: 'Access denied' });
  if (user.role === 'developer' && project.developer_id !== user.id) return res.status(403).json({ error: 'Access denied' });

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const result = db.prepare(`
    INSERT INTO project_files (project_id, uploaded_by, file_name, file_type, file_size, file_path, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    project.id, user.id, req.file.originalname,
    req.file.mimetype, req.file.size,
    req.file.path.replace(/\\/g, '/'),
    req.body.description || null
  );

  res.status(201).json({ message: 'File uploaded', fileId: result.lastInsertRowid, fileName: req.file.originalname });
});

// GET /api/files/:fileId — Download/view file
router.get('/:fileId', authenticate, (req, res) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM project_files WHERE id = ? AND is_deleted = 0').get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  // Auth check
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(file.project_id);
  const user = req.user;
  if (user.role === 'sales' && project.salesperson_id !== user.id) return res.status(403).json({ error: 'Access denied' });
  if (user.role === 'developer' && project.developer_id !== user.id) return res.status(403).json({ error: 'Access denied' });

  if (!fs.existsSync(file.file_path)) return res.status(404).json({ error: 'File not found on disk' });
  res.download(file.file_path, file.file_name);
});

module.exports = router;
