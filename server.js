const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = __dirname;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const MAX_BODY_BYTES = 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const content = require('node:fs').readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex < 0) return;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
      if (key && process.env[key] == null) process.env[key] = value;
    });
  } catch {
    // .env is optional; production hosts usually provide environment variables directly.
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/ai-insights') {
      await handleAiInsights(req, res);
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      await serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { error: 'Metodo nao permitido.' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Erro interno.' });
  }
});

server.listen(PORT, () => {
  console.log(`Fit Tracker rodando em http://localhost:${PORT}`);
});

async function handleAiInsights(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 500, { error: 'OPENAI_API_KEY nao configurada no servidor.' });
    return;
  }

  const body = await readJsonBody(req);
  const scope = body.scope === 'dashboard' ? 'dashboard' : 'workout';
  const prompt = buildInsightPrompt(scope, body);

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: [
        'Voce e um coach fitness brasileiro, objetivo e responsavel.',
        'Gere insights praticos sobre treino, medidas e evolucao corporal.',
        'Nao faca diagnosticos medicos, nao prometa resultados e recomende procurar profissional quando houver dor, lesao ou sintomas.',
        'Responda em portugues do Brasil com no maximo 6 bullets curtos.',
      ].join(' '),
      input: prompt,
      max_output_tokens: 700,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    sendJson(res, response.status, { error: data.error?.message || 'Falha ao chamar a OpenAI.' });
    return;
  }

  sendJson(res, 200, { insight: extractOutputText(data) });
}

function buildInsightPrompt(scope, body) {
  const payload = scope === 'dashboard'
    ? { dashboard: body.dashboard }
    : { dashboard: body.dashboard, workout: body.workout };

  return [
    `Analise o escopo: ${scope}.`,
    'Use apenas os dados enviados. Se faltar historico, diga isso e foque no que pode ser observado.',
    'Para treino: comente volume, consistencia entre carga e repeticoes, progressao provavel e ajuste para a proxima sessao.',
    'Para dashboard: comente peso, gordura corporal, IMC, massa magra e tendencia quando houver historico.',
    'Dados:',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .filter(Boolean)
    .join('\n')
    .trim() || 'A IA nao retornou texto.';
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Payload muito grande.');
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Acesso negado.');
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const contentType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method !== 'HEAD') res.end(content);
    else res.end();
  } catch {
    sendText(res, 404, 'Arquivo nao encontrado.');
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}
