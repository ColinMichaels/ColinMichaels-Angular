const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const OPEN_WEATHER_MAP_API_KEY = defineSecret('OPEN_WEATHER_MAP_API_KEY');

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-nano';
const OPENAI_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const OPEN_WEATHER_CURRENT_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPEN_WEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

exports.api = onRequest({
  region: 'us-east1',
  cors: true,
  timeoutSeconds: 30,
  memory: '256MiB',
  secrets: [OPENAI_API_KEY, OPEN_WEATHER_MAP_API_KEY]
}, async (req, res) => {
  try {
    const routePath = normalizeRoutePath(req.path);

    if (req.method === 'POST' && routePath === '/openai/chat') {
      await handleOpenAiChat(req, res);
      return;
    }

    if (req.method === 'GET' && routePath === '/weather/current') {
      await handleWeatherProxy(req, res, OPEN_WEATHER_CURRENT_URL);
      return;
    }

    if (req.method === 'GET' && routePath === '/weather/forecast') {
      await handleWeatherProxy(req, res, OPEN_WEATHER_FORECAST_URL);
      return;
    }

    res.status(404).json({error: 'Not found'});
  } catch (error) {
    logger.error('Unhandled API proxy error', {
      message: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method
    });
    res.status(500).json({error: 'Internal server error'});
  }
});

async function handleOpenAiChat(req, res) {
  const body = isObject(req.body) ? req.body : {};
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (messages.length === 0) {
    res.status(400).json({error: 'Request must include a non-empty messages array.'});
    return;
  }

  const payload = {
    model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_OPENAI_MODEL,
    messages
  };

  if (typeof body.temperature === 'number') {
    payload.temperature = body.temperature;
  }

  const upstreamResponse = await fetch(OPENAI_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY.value()}`
    },
    body: JSON.stringify(payload)
  });

  const upstreamBody = await parseUpstreamJson(upstreamResponse);
  if (!upstreamResponse.ok) {
    res.status(upstreamResponse.status).json({
      error: extractUpstreamError(upstreamBody, 'OpenAI request failed.')
    });
    return;
  }

  res.status(200).json(upstreamBody);
}

async function handleWeatherProxy(req, res, upstreamUrl) {
  const city = getQueryValue(req.query.q);
  const lat = getQueryValue(req.query.lat);
  const lon = getQueryValue(req.query.lon);
  const units = getQueryValue(req.query.units) || 'metric';

  if (!city && (!lat || !lon)) {
    res.status(400).json({error: 'Provide either q (city) or lat and lon query parameters.'});
    return;
  }

  const query = new URLSearchParams();
  if (city) {
    query.set('q', city);
  } else {
    query.set('lat', lat);
    query.set('lon', lon);
  }
  query.set('units', units);
  query.set('appid', OPEN_WEATHER_MAP_API_KEY.value());

  const upstreamResponse = await fetch(`${upstreamUrl}?${query.toString()}`);
  const upstreamBody = await parseUpstreamJson(upstreamResponse);

  if (!upstreamResponse.ok) {
    res.status(upstreamResponse.status).json({
      error: extractUpstreamError(upstreamBody, 'OpenWeatherMap request failed.')
    });
    return;
  }

  res.status(200).json(upstreamBody);
}

function normalizeRoutePath(path) {
  const value = typeof path === 'string' ? path : '/';
  const trimmed = value.replace(/\/+$/, '') || '/';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (withLeadingSlash === '/api') {
    return '/';
  }

  return withLeadingSlash.startsWith('/api/') ? withLeadingSlash.slice(4) : withLeadingSlash;
}

function getQueryValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]).trim() : '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}

async function parseUpstreamJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function extractUpstreamError(payload, fallback) {
  if (!isObject(payload)) {
    return fallback;
  }

  const topLevelError = payload.error;
  if (typeof topLevelError === 'string' && topLevelError.trim()) {
    return topLevelError;
  }

  if (isObject(topLevelError)) {
    const message = topLevelError.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  const message = payload.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}
