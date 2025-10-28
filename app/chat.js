// This is a Vercel Serverless Function.
// It will run on a server, not in the browser.

export default async function handler(request, response) {
    // 1. Get the user's question from the browser's request
    const { userQuery, portfolioContext } = await request.body;

    // 2. Get your *secret* API key from Vercel's Environment Variables
    const API_KEY = process.env.GEMINI_API_KEY;
    const GENERATE_TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

    // 3. Create the same RAG prompt you did before
    const systemPrompt = `
        You are a helpful and professional portfolio assistant for Prajna Bhat...
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
            throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }

        const geminiResult = await geminiResponse.json();
        const responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;

        // 5. Send the final answer back to the browser
        response.status(200).json({ answer: responseText });

    } catch (error) {
        console.error(error);
        response.status(500).json({ answer: "Sorry, I couldn't connect to the AI assistant." });
    }
}