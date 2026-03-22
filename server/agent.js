import "dotenv/config";
import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchTranscript } from 'youtube-transcript-plus';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { vectorStore, addYTVideoToVectorStore } from "./embeddings.js";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getInfo(videoId) {
    try {
        const transcript = await fetchTranscript(videoId, {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        const video = transcript.map((item) => item.text).join(" ");
        return video;
    } catch (e) {
        console.error("Error fetching transcript:", e.message);
        throw new Error(`Failed to fetch transcript for video ${videoId}: ${e.message}`);
    }
}

function extractYouTubeVideoId(input) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^[a-zA-Z0-9_-]{11}$/
    ];
    
    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

async function checkVideoExists(videoId) {
    try {
        const result = await pool.query(
            'SELECT 1 FROM transcripts WHERE metadata->>\'video_id\' = $1 LIMIT 1',
            [videoId]
        );
        return result.rows.length > 0;
    } catch (e) {
        console.error("Error checking video existence:", e.message);
        return false;
    }
}

async function deleteVideoChunks(videoId) {
    try {
        await pool.query(
            'DELETE FROM transcripts WHERE metadata->>\'video_id\' = $1',
            [videoId]
        );
        return true;
    } catch (e) {
        console.error("Error deleting video chunks:", e.message);
        return false;
    }
}

const loadedVideos = new Map();

async function loadVideo(videoId, force = false) {
    const videoExists = await checkVideoExists(videoId);
    
    if (videoExists && !force) {
        loadedVideos.set(videoId, Date.now());
        return `Video ${videoId} is already in the database. You can ask questions about it directly.`;
    }
    
    if (videoExists && force) {
        console.log(`Re-processing video ${videoId}...`);
        await deleteVideoChunks(videoId);
    }
    
    try {
        const video_transcript = await getInfo(videoId);
        await addYTVideoToVectorStore({ transcript: video_transcript, video_id: videoId });
        loadedVideos.set(videoId, Date.now());
        return force 
            ? `Successfully refreshed video ${videoId}. You can now ask questions about its updated content.`
            : `Successfully loaded and processed video ${videoId}. You can now ask questions about its content.`;
    } catch (error) {
        console.error("Error processing video:", error.message);
        return `Failed to process video ${videoId}: ${error.message}`;
    }
}

const videoLoaderTool = tool(async ({ query, force }) => {
    const videoId = extractYouTubeVideoId(query);
    
    if (!videoId) {
        return "No valid YouTube URL or video ID found in the query. Please provide a valid YouTube link.";
    }
    
    return await loadVideo(videoId, force || false);
}, {
    name: "video_loader",
    description: "CRITICAL: ALWAYS call this tool when you detect ANY YouTube URL, YouTube video ID, or reference to a YouTube video in the user's query. This includes links like 'youtube.com/watch?v=', 'youtu.be/', 'youtube.com/embed/', or 11-character video IDs. This tool extracts the video ID, checks if it exists in the database, and loads the transcript if needed. Never skip this tool when YouTube content is mentioned.",
    schema: z.object({
        query: z.string().describe("User's complete query that may contain YouTube URL or video ID"),
        force: z.boolean().optional().describe("Force re-process the video even if it exists in database"),
    }),
})

const refreshVideoTool = tool(async ({ query }) => {
    const videoId = extractYouTubeVideoId(query);
    
    if (!videoId) {
        return "No valid YouTube URL or video ID found. Please provide a valid YouTube link to refresh.";
    }
    
    const videoExists = await checkVideoExists(videoId);
    
    if (!videoExists) {
        return `Video ${videoId} is not in the database. Use the video_loader tool to load it first.`;
    }
    
    return await loadVideo(videoId, true);
}, {
    name: "refresh_video",
    description: "Refresh/re-process a YouTube video that is already in the database. Use this when the user wants to get the latest transcript or re-analyze the video. Always provide a YouTube URL or video ID.",
    schema: z.object({
        query: z.string().describe("User's query containing YouTube URL or video ID to refresh"),
    }),
})

const retrieveTool = tool(async ({ query, videoId: configVideoId }) => {
    let videoId = extractYouTubeVideoId(query);
    
    if (!videoId && configVideoId) {
        videoId = configVideoId;
    }
    
    if (!videoId) {
        const recentVideos = Array.from(loadedVideos.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 1);
        
        if (recentVideos.length > 0) {
            videoId = recentVideos[0][0];
        }
    }
    
    if (!videoId) {
        return "No YouTube video found. Please provide a YouTube URL or video ID to search within.";
    }
    
    const retrievedDocs = await vectorStore.similaritySearch(query, 3, { video_id: videoId });
    
    if (retrievedDocs.length === 0) {
        return `No transcript content found for video ${videoId}. The video may not be loaded yet. Please provide the YouTube URL first.`;
    }
    
    const serializedDocs = retrievedDocs.map(doc => doc.pageContent).join("\n");
    
    return serializedDocs;
}, {
    name: "retrieve",
    description: "Retrieve the most relevant chunks of text from the transcript of a youtube video. If no video ID is in the query, uses the most recently loaded video.",
    schema: z.object({
        query: z.string().describe("User's query"),
        videoId: z.string().optional().describe("Optional video ID from config"),
    }),
})

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY
});

const checkpointer = new MemorySaver();

const systemPrompt = `You are a helpful AI assistant that can answer questions about YouTube videos.

IMPORTANT RULES:
1. ALWAYS call the video_loader tool when you detect ANY YouTube URL, video ID, or reference to YouTube content in the user's query
2. Look for patterns like: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, or 11-character alphanumeric strings
3. After loading a video, use the retrieve tool to find relevant information for answering questions
4. For follow-up questions without a URL, the retrieve tool will use the most recently loaded video
5. Never assume a video is already loaded - always check with video_loader first if the user provides a new URL
6. If the user asks to "refresh", "reprocess", or "reload" a video, use the refresh_video tool

When a user mentions a YouTube video, your first action should always be to call video_loader, then use retrieve to find information, then answer their question.`;

export const agent = createAgent({ 
    model, 
    tools: [retrieveTool, videoLoaderTool, refreshVideoTool], 
    checkpointer,
    messages: [{ role: "system", content: systemPrompt }]
});
