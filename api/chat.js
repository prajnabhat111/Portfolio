import fs from 'fs';
import path from 'path';

async function getActiveGroqModel(apiKey) {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error("Could not fetch Groq models");
    
    const { data } = await res.json();
    // Filter out audio/whisper/guard/vision-only utility models
    const chatModels = data
        .map(m => m.id)
        .filter(id => !/whisper|guard|tts|safeguard/i.test(id));

    // Prefer larger/newer general chat models if available, otherwise use the first active one
    return chatModels.find(id => /70b|120b|llama-4|qwen|gpt-oss/i.test(id)) || chatModels[0];
}

// Reads index.html from your repository and strips HTML/CSS/JS markup
function getPortfolioContext() {
    try {
        const htmlPath = path.join(process.cwd(), 'index.html');
        const rawHtml = fs.readFileSync(htmlPath, 'utf-8');

        return rawHtml
            // Remove <script> and <style> blocks completely
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, ' ')
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, ' ')
            // Strip all remaining HTML tags
            .replace(/<[^>]+>/g, ' ')
            // Decode common HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Collapse extra whitespace/newlines into single spaces
            .replace(/\s+/g, ' ')
            .trim();
    } catch (error) {
        console.error("Failed to read index.html:", error);
        return "";
    }
}

async function callProvider({ url, apiKey, model, messages }) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.3
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Provider failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from provider");
    return content;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ answer: "Method Not Allowed" });
    }

    const { userQuery } = request.body;

    if (!userQuery || typeof userQuery !== 'string') {
        return response.status(400).json({ answer: "Missing or invalid query." });
    }

    const portfolioContext = getPortfolioContext();

    if (!portfolioContext) {
        return response.status(500).json({ answer: "Portfolio context could not be loaded." });
    }

    const systemPrompt = `
        You are a helpful and professional portfolio assistant for Prajna Bhat, a Data Scientist. 
        Your goal is to answer questions about Prajna's background, experience, projects, skills, education, and achievements.
        You MUST use ONLY the following portfolio text extracted from the website as your context. 
        If you cannot find the answer in the text, you must politely state that the information is not available in the provided portfolio.
        
        --- PORTFOLIO CONTEXT ---
        ${portfolioContext}
        --- END CONTEXT ---
    `;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
    ];

    let groqModel = "llama-3.1-8b-instant"; // Fallback default
    if (process.env.GROQ_API_KEY) {
        try {
            groqModel = await getActiveGroqModel(process.env.GROQ_API_KEY);
        } catch (e) {
            console.warn("Using default Groq model:", e.message);
        }
    }

    const providers = [
        {
            name: "Groq",
            url: "https://api.groq.com/openai/v1/chat/completions",
            apiKey: process.env.GROQ_API_KEY,
            model: groqModel
        },
        {
            name: "OpenRouter",
            url: "https://openrouter.ai/api/v1/chat/completions",
            apiKey: process.env.OPENROUTER_API_KEY,
            model: "openrouter/free"
        }
    ];

    for (const provider of providers) {
        if (!provider.apiKey) continue;

        try {
            const answer = await callProvider({
                url: provider.url,
                apiKey: provider.apiKey,
                model: provider.model,
                messages
            });
            return response.status(200).json({ answer });
        } catch (error) {
            console.warn(`${provider.name} failed, trying next provider...`, error.message);
        }
    }

    return response.status(500).json({ answer: "Sorry, I couldn't connect to the AI assistant." });
}