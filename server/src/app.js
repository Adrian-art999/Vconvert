import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mediaRoutes from './routes/media.routes.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, '../../public');
const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

app.use('/api', mediaRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((error, req, res, next) => {
  console.error('Error no controlado:', error.message || error);
  if (res.headersSent) {
    next(error);
    return;
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

const server = app.listen(port, () => {
  console.log(`API disponible en http://localhost:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
