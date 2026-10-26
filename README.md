# Vconvert

Aplicacion web para consultar y descargar audio o video de YouTube a partir de una URL.

El proyecto combina un frontend estatico en HTML, CSS y JavaScript vanilla con un backend en Node.js y Express. La extraccion de informacion y la transmision de archivos se realiza con `@distube/ytdl-core`, sin almacenar los medios en el servidor.

## Caracteristicas

- Interfaz oscura, minimalista y responsiva.
- Barra de navegacion sticky con logo, enlaces y menu hamburguesa en moviles.
- Modal con secciones separadas para `Sobre mi` y `Documentacion`.
- Consulta de metadatos de YouTube: titulo, autor, duracion, miniatura y formatos.
- Descarga directa por streaming de audio o video.
- Seleccion de calidad de video cuando el formato esta disponible.
- Validacion de URLs de YouTube.
- Cancelacion del stream cuando el cliente cierra la conexion.
- Boton del logo para recargar la pagina.

## Tecnologias

### Frontend

- HTML5
- CSS3
- JavaScript vanilla
- Fetch API

### Backend

- Node.js
- Express
- CORS
- `@distube/ytdl-core`
- Modulos ES de Node.js

## Requisitos

- Node.js `^22.22.2`, `^24.15.0` o `>=26.0.0`.
- npm.
- Conexion a internet para consultar YouTube.

La version de Node es un requisito de `@distube/ytdl-core` 5.x. El proyecto fue probado con Node `24.22.1`.

## Instalacion

Desde la raiz del proyecto:

```bash
cd server
npm install
npm start
```

Abrir en el navegador:

```text
http://localhost:3000
```

Para desarrollo con recarga automatica del servidor:

```bash
npm run dev
```

En PowerShell, si la ejecucion de scripts esta bloqueada, usar:

```powershell
npm.cmd install
npm.cmd start
```

## Uso

1. Abrir `http://localhost:3000`.
2. Pegar una URL de YouTube.
3. Elegir `Video` o `Audio`.
4. Seleccionar la calidad si se descarga video.
5. Presionar `Consultar`.
6. Presionar el boton de descarga cuando aparezca el resultado.

El frontend debe ejecutarse desde el servidor Express. Abrir `public/index.html` directamente como archivo local no permite consumir la API.

## Estructura del proyecto

```text
vconvert/
├── public/
│   ├── assets/
│   │   └── img/
│   │       └── logo.png
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── controllers/
│   │   │   └── media.controller.js
│   │   └── routes/
│   │       └── media.routes.js
│   ├── .gitignore
│   ├── package-lock.json
│   └── package.json
├── .gitignore
└── README.md
```

## Configuracion

El servidor usa el puerto `3000` por defecto. Se puede cambiar con la variable de entorno `PORT`.

Linux o macOS:

```bash
PORT=4000 npm start
```

PowerShell:

```powershell
$env:PORT = "4000"
npm.cmd start
```

Actualmente el proyecto no carga archivos `.env` automaticamente. El archivo `.env` esta incluido en `.gitignore` por seguridad, pero si se necesita esa carga se debe integrar `dotenv`.

## API

La API se monta bajo el prefijo `/api`.

### GET /api/info

Obtiene la informacion del video y los formatos disponibles.

Parametros:

| Parametro | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| `url` | string | Si | URL del video de YouTube |

Ejemplo:

```bash
curl "http://localhost:3000/api/info?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Daqz-KE-bpKQ"
```

Respuesta simplificada:

```json
{
  "id": "aqz-KE-bpKQ",
  "title": "Titulo del video",
  "author": "Autor",
  "duration": 635,
  "thumbnail": "https://...",
  "isLive": false,
  "formats": [
    {
      "itag": 251,
      "mimeType": "audio/webm; codecs=\"opus\"",
      "extension": "webm",
      "qualityLabel": null,
      "height": null,
      "audioBitrate": 128,
      "bitrate": null,
      "contentLength": 10202210,
      "hasAudio": true,
      "hasVideo": false,
      "isDrm": false,
      "isOtf": false
    }
  ],
  "download": {
    "audio": "/api/download?url=...&type=audio",
    "video": "/api/download?url=...&type=video"
  }
}
```

Codigos de respuesta:

| Codigo | Descripcion |
|---|---|
| `200` | Informacion obtenida correctamente |
| `400` | URL ausente o invalida |
| `502` | No se pudo obtener la informacion del video |

### GET /api/download

Descarga el audio o video seleccionado mediante streaming.

Parametros:

| Parametro | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| `url` | string | Si | URL del video de YouTube |
| `type` | string | No | `audio` o `video`. Por defecto `video` |
| `quality` | number | No | Altura del video, por ejemplo `360`, `480` o `720` |

Ejemplo de audio:

```bash
curl "http://localhost:3000/api/download?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Daqz-KE-bpKQ&type=audio" -o audio.webm
```

Ejemplo de video en 360p:

```bash
curl "http://localhost:3000/api/download?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Daqz-KE-bpKQ&type=video&quality=360" -o video.webm
```

La respuesta incluye:

- `Content-Type` segun el formato elegido.
- `Content-Disposition: attachment` con un nombre de archivo saneado.
- `Content-Length` cuando el formato lo informa.
- `Cache-Control: no-store`.

Codigos de respuesta:

| Codigo | Descripcion |
|---|---|
| `200` | Stream iniciado correctamente |
| `400` | URL ausente o invalida |
| `404` | No hay un formato disponible para la solicitud |
| `409` | El video es una transmision en vivo |
| `502` | No se pudo iniciar la descarga |

## Logica de seleccion de formatos

- Audio: se prioriza un formato solo de audio y luego cualquier formato con audio.
- Video: se intenta la altura solicitada con audio incluido, luego el mejor formato progresivo y, como ultimo recurso, un formato solo de video.
- Se excluyen formatos DRM y OTF del listado de informacion.
- El listado de informacion se limita a 50 formatos.

El proyecto no incluye `ffmpeg`, por lo que no mezcla pistas de audio y video separadas. En algunos videos el formato de video disponible puede no incluir audio.

## Frontend

- `public/index.html`: estructura de la pagina, navbar, formulario y modal.
- `public/css/styles.css`: tema oscuro, layout responsivo, navbar, formulario y modal.
- `public/js/app.js`: consulta a la API, renderizado del resultado, menu movil y control del modal.
- `public/assets/img/logo.png`: logotipo usado en la navbar y como favicon.

El modal muestra una seccion a la vez:

- `Sobre mi`: presentacion personal y datos de contacto.
- `Documentacion`: resumen tecnico del frontend, backend y endpoints.

## Limitaciones

- YouTube puede cambiar sus mecanismos internos y provocar errores como `Failed to find any playable formats`.
- No se descargan transmisiones en vivo.
- No se soportan formatos DRM.
- Los videos con restriccion de edad pueden requerir cookies de una cuenta autenticada.
- No se almacenan archivos ni historial de descargas.
- El servidor no incluye autenticacion, rate limiting ni persistencia.
- CORS esta abierto para todos los origenes por defecto.

Para un despliegue publico se recomienda restringir CORS, agregar rate limiting y establecer limites de uso.

## Problemas comunes

### El puerto 3000 esta ocupado

Cambiar el puerto con `PORT` o detener el proceso que lo esta usando.

### PowerShell no reconoce npm

Usar `npm.cmd` en lugar de `npm`.

### Error al obtener formatos

Actualizar dependencias:

```bash
npm install
```

Verificar la version de Node y probar con otra URL. Si el problema persiste, puede deberse a cambios de YouTube o a la necesidad de cookies.

### El favicon no cambia

Recargar con `Ctrl + F5` para limpiar la cache del navegador.

### Los cambios del backend no se reflejan

Detener el servidor y volver a iniciarlo. El modo `npm run dev` recarga automaticamente.

## Aviso legal

Vconvert no esta afiliado a YouTube. La herramienta debe utilizarse unicamente con contenido propio o con autorizacion expresa de los titulares de los derechos. El usuario es responsable del uso que haga del proyecto.

## Autor

Estudiante de programacion y desarrollador junior.

- WhatsApp: `0424-6504362`
- Gmail: `datealovstack@gmail.com`

## Creditos

- [Express](https://expressjs.com/)
- [@distube/ytdl-core](https://github.com/distubejs/ytdl-core)
