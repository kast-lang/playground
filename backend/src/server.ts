import express from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_TOKEN in environment variables');
}

app.post('/share', async (req: Request, res: Response) => {
    const { code, filename = 'main.ks' } = req.body as {
        code?: string;
        filename?: string;
    };

    if (!code) {
        return res.status(400).json({ error: 'Missing code' });
    }

    try {
        const gist = await axios.post(
            'https://api.github.com/gists',
            {
                description: 'Shared via Kast Playground',
                public: true,
                files: {
                    [filename]: {
                        content: code,
                    },
                },
            },
            {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'kast-playground',
                },
            },
        );

        return res.json({ url: gist.data.html_url });
    } catch (err: any) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ error: 'Failed to create gist' });
    }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
