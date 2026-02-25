import express from "express";
import cors from "cors";
import {agent} from "./agent.js"
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.post("/generate", async (req, res) => {
    const { query, video_id,thread_id } = req.body;
    console.log(query);

    console.log("Sending request to Gemini..."); // Debug line
    //testing the agent


    const results = await agent.invoke({
        messages: [{ role: "user", content: query }],
    },
        { configurable: { thread_id, video_id } }
    );

    res.send(results.messages.at(-1)?.content);
})
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
