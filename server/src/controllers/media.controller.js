import { Ytdl, chooseFormat, parseVideoId, Quality } from '@distube/ytdl-core';
import { pipeline } from 'node:stream/promises';

const ytdl = new Ytdl();

function parseYouTubeUrl(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parseVideoId(parsed.href) ? parsed.href : null;
  } catch {
    return null;
  }
}

function extensionFor(format) {
  const mime = String(format.mimeType || '').split(';')[0];
  if (mime === 'audio/mp4') return 'm4a';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'audio/webm' || mime === 'video/webm') return 'webm';
  return format.container || 'mp4';
}

function scoreFormat(format) {
  return (format.height || 0) * 100000 + (format.bitrate || 0) * 10 + (format.audioBitrate || 0);
}

function selectFormat(formats, type, quality) {
  if (type === 'audio') {
    return chooseFormat(formats, {
      quality: Quality.HighestAudio,
      filter: [{ hasAudio: true, hasVideo: false }, { hasAudio: true }]
    });
  }

  const filters = [];
  const requestedHeight = Number.parseInt(quality, 10);

  if (Number.isFinite(requestedHeight)) {
    filters.push((format) => format.hasAudio && format.hasVideo && format.height === requestedHeight);
  }

  filters.push({ hasAudio: true, hasVideo: true });
  filters.push({ hasVideo: true });

  return chooseFormat(formats, {
    quality: Quality.Highest,
    filter: filters
  });
}

function summarizeFormat(format) {
  return {
    itag: format.itag,
    mimeType: format.mimeType || null,
    extension: extensionFor(format),
    qualityLabel: format.qualityLabel || null,
    height: format.height || null,
    audioBitrate: format.audioBitrate || null,
    bitrate: format.bitrate || null,
    contentLength: format.contentLength || null,
    hasAudio: Boolean(format.hasAudio),
    hasVideo: Boolean(format.hasVideo),
    isDrm: Boolean(format.isDrm),
    isOtf: Boolean(format.isOtf)
  };
}

function buildFilename(title, extension) {
  const base = String(title || 'media')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 100);
  return `${base || 'media'}.${extension}`;
}

function sendError(res, status, message) {
  if (!res.headersSent) res.status(status).json({ error: message });
}

export async function getInfo(req, res) {
  const url = parseYouTubeUrl(req.query.url);
  if (!url) {
    sendError(res, 400, 'La URL de YouTube no es valida');
    return;
  }

  try {
    const info = await ytdl.getInfo(url);
    const details = info.videoDetails;
    const formats = info.formats
      .filter((format) => (format.hasAudio || format.hasVideo) && !format.isDrm && !format.isOtf)
      .map(summarizeFormat)
      .sort((a, b) => scoreFormat(b) - scoreFormat(a))
      .slice(0, 50);

    res.json({
      id: details.id,
      title: details.title,
      author: details.author?.name || '',
      duration: Number(details.lengthSeconds) || 0,
      thumbnail: details.thumbnails?.at(-1)?.url || null,
      isLive: Boolean(details.isLive),
      formats,
      download: {
        audio: `/api/download?url=${encodeURIComponent(url)}&type=audio`,
        video: `/api/download?url=${encodeURIComponent(url)}&type=video`
      }
    });
  } catch (error) {
    console.error('Error al obtener informacion:', error.message || error);
    sendError(res, 502, 'No se pudo obtener la informacion del video');
  }
}

export async function download(req, res) {
  const url = parseYouTubeUrl(req.query.url);
  if (!url) {
    sendError(res, 400, 'La URL de YouTube no es valida');
    return;
  }

  const type = req.query.type === 'audio' ? 'audio' : 'video';
  let stream = null;
  let controller = null;
  let clientClosed = false;

  try {
    const info = await ytdl.getInfo(url);
    if (info.videoDetails.isLive) {
      sendError(res, 409, 'No se pueden descargar transmisiones en vivo');
      return;
    }

    let format;
    try {
      format = selectFormat(info.formats, type, req.query.quality);
    } catch {
      sendError(res, 404, 'No hay un formato disponible para la solicitud');
      return;
    }

    const extension = extensionFor(format);
    const filename = buildFilename(info.videoDetails.title, extension);

    res.setHeader('Content-Type', format.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    if (format.contentLength) {
      res.setHeader('Content-Length', format.contentLength);
    }

    controller = new AbortController();
    stream = ytdl.download(info, {
      format,
      highWaterMark: 1 << 24,
      signal: controller.signal
    });

    res.on('close', () => {
      if (!res.writableEnded) clientClosed = true;
      controller.abort();
      stream.destroy();
    });

    await pipeline(stream, res);
  } catch (error) {
    if (stream) stream.destroy();
    if (res.headersSent) {
      if (!clientClosed) {
        console.error('Error al descargar contenido:', error.message || error);
      }
      res.destroy();
      return;
    }
    console.error('Error al descargar contenido:', error.message || error);
    sendError(res, 502, 'No se pudo descargar el contenido');
  }
}
