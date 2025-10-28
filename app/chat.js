// This is a Vercel Serverless Function.
// It will run on a server, not in the browser.

export default async function handler(request, response) {
    // 1. Get the user's question from the browser's request
    // We only need to handle POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ answer: "Method Not Allowed" });
    }
    
    const { userQuery, portfolioContext } = request.body;

    if (!userQuery || !portfolioContext) {
        return response.status(400).json({ answer: "Missing query or context." });
    }

    // 2. Get your *secret* API key from Vercel's Environment Variables
    const API_KEY = process.env.GEMINI_API_KEY;
    const GENERATE_TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

    // 3. Create the same RAG prompt you did before
    const systemPrompt = `
        You are a helpful and professional portfolio assistant for Prajna Bhat, a Data Scientist. 
        Your goal is to answer questions about Prajna's background, experience, projects, skills, education, and achievements.
        You MUST use ONLY the following portfolio text as your context. 
        If you cannot find the answer in the text, you must politely state that the information is not available in the provided portfolio.
        
        --- PORTFOLIO CONTEXT ---
        ${portfolioContext}
        --- END CONTEXT ---
    `;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const geminiResponse = await fetch(GENERATE_TEXT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API Error:", errorText);
            throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }

        const geminiResult = await geminiResponse.json();
        
        if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
             console.error("Gemini Response Error:", geminiResult);
             throw new Error("Invalid response structure from Gemini API.");
        }
        
        const responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;

        // 5. Send the final answer back to the browser
        response.status(200).json({ answer: responseText });

    } catch (error) {
        console.error("Internal Server Error:", error);
        response.status(500).json({ answer: "Sorry, I couldn't connect to the AI assistant." });
    }
}
