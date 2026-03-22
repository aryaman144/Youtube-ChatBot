import express from "express";
import cors from "cors";
import { agent } from "./agent.js"

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ status: "ok", message: "RAG Agent API running" });
});

app.post("/generate", async (req, res) => {
    const { query, thread_id, video_id } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ error: "Query is required and must be a non-empty string" });
    }

    try {
        console.log("Processing query:", query.substring(0, 100));
        
        const results = await agent.invoke({
            messages: [{ role: "user", content: query }],
        }, {
            configurable: { 
                thread_id: thread_id || Date.now().toString(),
                video_id: video_id || null 
            }
        });

        const responseContent = results.messages.at(-1)?.content;
        
        if (!responseContent) {
            return res.status(500).json({ error: "No response generated" });
        }

        res.json({ response: responseContent });
    } catch (error) {
        console.error("Agent error:", error);
        res.status(500).json({ 
            error: "Failed to process request",
            message: error.message 
        });
    }
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for: ${FRONTEND_URL}`);
});
