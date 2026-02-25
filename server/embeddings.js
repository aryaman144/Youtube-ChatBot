import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    //apiKey: process.env.GOOGLE_API_KEY
});

export const vectorStore = await PGVectorStore.initialize(embeddings,{
    postgresConnectionOptions:{
        connectionString: process.env.DATABASE_URL
    },
    tableName:"transcripts",
    columns:{
        idColumnName:"id",
        vectorColumnName:"vector",
        contentColumnName:"content",
        metadataColumnName:"metadata"
    },
    distanceStrategy:"cosine",
});

export const addYTVideoToVectorStore = async(videoData) => {
    const {transcript, video_id} = videoData;
    
    const docs = [new Document({
        pageContent: transcript,
        metadata: { video_id}
    })];
    // Split video into chunks
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments(docs);

    //Embed the chunks


    await vectorStore.addDocuments(chunks);
}