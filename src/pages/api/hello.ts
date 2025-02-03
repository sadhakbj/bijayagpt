import type { NextApiRequest } from "next";
import { Ollama, OllamaEmbeddings } from "@langchain/ollama";

export const config = {
    runtime: "edge", // Required for streaming
};

const llm = new Ollama({
    model: "llama3.2",
    temperature: 0,
    maxRetries: 2,
});


import { ChromaClient } from "chromadb";

const chromaClient = new ChromaClient({ path: "http://localhost:8000" })
const collectionName = "project_docs";


const retriveRelevantDocs = async (query: string) => {
    const collection = await chromaClient.getOrCreateCollection({ name: collectionName })

    const embeddings = new OllamaEmbeddings({
        model: "nomic-embed-text", // Default value
        baseUrl: "http://localhost:11434", // Default value
    });

    // Step 2: Generate the embeddings for the query
    const queryEmbedding = await embeddings.embedDocuments([query]);

    // Step 3: Use the query embeddings to query your collection
    const results = await collection.query({
        queryEmbeddings: queryEmbedding, // Use the generated embeddings
    });

    console.log(results)

    return results;
}


export default async function handler(req: NextApiRequest) {
    // Ensure the method is POST
    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Only POST method is allowed" }),
            { status: 405, headers: { "Content-Type": "application/json" } }
        );
    }

    // Parse the incoming JSON body
    const requestBody = await req.json();
    const inputText = requestBody?.message || "Ollama is an AI company that "; // Default text if not provided

    const docs = await retriveRelevantDocs(inputText)
    // Access the documents directly from the response
    const docsArray = docs.documents || []; // Assuming documents is the correct field

    // Convert each document object to a formatted string
    const docsString = docsArray.map(doc => {
        // If each element of documents is a string, no need for further processing
        return typeof doc === "string" ? doc : JSON.stringify(doc);
    }).join("\n");

    // Create the prompt
    const prompt = `Use the following documentation:\n${docsString}\n\nQuestion: ${inputText}. If you don't find any releavant answer in my user fed data use your own knowledge base and give me answer.`;

    console.log("Final Prompt:", prompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of await llm.stream(prompt)) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
        },
    });
}
