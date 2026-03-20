import "dotenv/config";
import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchTranscript } from 'youtube-transcript-plus';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { vectorStore,addYTVideoToVectorStore } from "./embeddings.js";
// Fetch transcript from YouTube
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

// Extract YouTube video ID from URL or return the ID if already extracted
function extractYouTubeVideoId(input) {
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^[a-zA-Z0-9_-]{11}$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Check if video exists in database
async function checkVideoExists(videoId) {
    try {
        const existingDocs = await vectorStore.similaritySearch("dummy query", 1, { video_id: videoId });
        return existingDocs.length > 0;
    } catch (e) {
        console.error("Error checking video existence:", e.message);
        return false;
    }
}

// This line can be removed or commented out since we now load videos on-demand
// const video_transcript = await getInfo();
// await addYTVideoToVectorStore({transcript:video_transcript,video_id:"JljlsOJmlCA"});


//infoTool
const videoLoaderTool = tool(async ({ query }) => {
    const videoId = extractYouTubeVideoId(query);
    
    if (!videoId) {
        return "No valid YouTube URL or video ID found in the query. Please provide a valid YouTube link.";
    }
    
    const videoExists = await checkVideoExists(videoId);
    
    if (videoExists) {
        return `Video ${videoId} is already in the database. You can ask questions about it directly.`;
    }
    
    try {
        const video_transcript = await getInfo(videoId);
        await addYTVideoToVectorStore({ transcript: video_transcript, video_id: videoId });
        return `Successfully loaded and processed video ${videoId}. You can now ask questions about its content.`;
    } catch (error) {
        console.error("Error processing video:", error.message);
        return `Failed to process video ${videoId}: ${error.message}`;
    }
}, {
    name: "video_loader",
    description: "CRITICAL: ALWAYS call this tool when you detect ANY YouTube URL, YouTube video ID, or reference to a YouTube video in the user's query. This includes links like 'youtube.com/watch?v=', 'youtu.be/', 'youtube.com/embed/', or 11-character video IDs. This tool extracts the video ID, checks if it exists in the database, and loads the transcript if needed. Never skip this tool when YouTube content is mentioned.",
    schema: z.object({
        query: z.string().describe("User's complete query that may contain YouTube URL or video ID"),
    }),
})

//retrieval tool
const retrieveTool = tool(async ({ query }) => {
    const videoId = extractYouTubeVideoId(query);
    
    if (!videoId) {
        return "No YouTube video found in the query to retrieve information from.";
    }
    
    const retrievedDocs = await vectorStore.similaritySearch(query, 3, { video_id: videoId });
    const serializedDocs = retrievedDocs.map(doc => doc.pageContent).join("\n");
    
    return serializedDocs;
}, {
    name: "retrieve",
    description: "Retrieve the most relevant chunks of text from the transcript of a youtube video. Extracts video ID from the query automatically.",
    schema: z.object({
        query: z.string().describe("User's query that may contain YouTube URL or video ID"),
    }),
})

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY
});

const checkpointer = new MemorySaver();

// System prompt to ensure consistent tool usage
const systemPrompt = `You are a helpful AI assistant that can answer questions about YouTube videos.

IMPORTANT RULES:
1. ALWAYS call the video_loader tool when you detect ANY YouTube URL, video ID, or reference to YouTube content in the user's query
2. Look for patterns like: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, or 11-character alphanumeric strings
3. After loading a video, use the retrieve tool to find relevant information for answering questions
4. Never assume a video is already loaded - always check with video_loader first

When a user mentions a YouTube video, your first action should always be to call video_loader, then use retrieve to find information, then answer their question.`;

export const agent = createAgent({ 
    model, 
    tools: [retrieveTool, videoLoaderTool], 
    checkpointer,
    // Add system message to guide the agent
    messages: [{ role: "system", content: systemPrompt }]
});

