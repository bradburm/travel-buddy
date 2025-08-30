import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    console.error('Missing API_KEY in .env');
    process.exit(1);
}
const API_KEY_STR: string = API_KEY;

const API_BASE = (process.env.USE_HTTPS === 'true' ? 'https' : 'http') + '://api.aviationstack.com/v1';

function buildUrl(endpoint: string, query: Record<string, string | string[] | undefined>) {
    const qs = new URLSearchParams({ access_key: API_KEY_STR });
    for (const [k, v] of Object.entries(query)) {
        if (typeof v === 'string') qs.set(k, v);
        else if (Array.isArray(v)) v.forEach(val => qs.append(k, val));
    }
    return `${API_BASE}/${endpoint}?${qs.toString()}`;
}

async function proxy(endpoint: string, reqQuery: Record<string, any>, res: express.Response) {
    try {
        const url = buildUrl(endpoint, reqQuery);
        const r = await fetch(url);
        const text = await r.text(); // forward body as-is
        res.status(r.status).type(r.headers.get('content-type') || 'application/json').send(text);
    } catch (e: any) {
        res.status(500).json({ error: 'proxy_error', message: String(e?.message || e) });
    }
}

app.get('/api/flights', (req, res) => proxy('flights', req.query as any, res));
app.get('/api/airports', (req, res) => proxy('airports', { limit: '5', offset: '0', ...(req.query as any) }, res));

app.use(express.static(path.join(__dirname, '../public')));

app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
});
