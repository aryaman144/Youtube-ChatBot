import "dotenv/config";
import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchTranscript } from 'youtube-transcript-plus';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { vectorStore,addYTVideoToVectorStore } from "./embeddings.js";
// Fetch transcript from YouTube
async function getInfo() {
    try {
        const transcript = await fetchTranscript('JljlsOJmlCA', {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        const video = transcript.map((item) => item.text).join(" ");
        return video;
    } catch (e) {
        console.error("Still empty or error:", e.message);
    }
}

const video_transcript = await getInfo();
await addYTVideoToVectorStore({transcript:video_transcript,video_id:"JljlsOJmlCA"});


//retrieval tool
const retrieveTool = tool(async ({ query },{configurable:{video_id}}) => {
    console.log("Retrieving docs for query");
    console.log(query);
    console.log(video_id);
    const retrievedDocs = await vectorStore.similaritySearch(query, 3,{video_id});
    console.log(retrievedDocs)
    const serializedDocs = retrievedDocs.map(doc => doc.pageContent).join("\n");
    
    return serializedDocs;
}, {
    name: "retrieve",
    description: "Retrieve the mosr relevant chunks of text from the transcript of a youtube video",
    schema: z.object({
        query: z.string(),
    }),
})

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY
});

const checkpointer = new MemorySaver();
export const agent = createAgent({ model, tools: [retrieveTool], checkpointer });

