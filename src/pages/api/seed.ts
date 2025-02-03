import type { NextApiRequest, NextApiResponse } from "next";
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
import { NextResponse } from "next/server";

const chromaClient = new ChromaClient({ path: "http://localhost:8000" })
const collectionName = "project_docs";


const createCollection = async () => {
    let collection = await chromaClient.getOrCreateCollection({
        name: collectionName
    })

    return collection
}

const generateEmbeddings = async (input: string) => {    
    const embeddings = new OllamaEmbeddings({
        model: "nomic-embed-text", // Default value
        baseUrl: "http://localhost:11434", // Default value
      });


      const res = await embeddings.embedQuery(input)
      return res;
}

const seedData = async () => {
    const collection = await createCollection();

    const text = "My name is bijaya and i am from Nepal, i was born in 1993";

    const embedding = await generateEmbeddings(text)

    await collection.add({
        ids: ['2'],
        embeddings: [embedding],
        documents: [text],
        metadatas: [{title: 'just my name'}]
    })
}


export default async function handler(req: NextApiRequest) {

   await seedData().catch(console.error)
}
