/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client on the server
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route: Redraft Email
  app.post("/api/email/redraft", async (req, res) => {
    const { subject, body, instructions, vendorName } = req.body;
    
    if (!instructions || !instructions.trim()) {
      return res.status(400).json({ error: "Instructions are required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Graceful fallback if API key is missing
      const fallbackBody = `[LOCAL fallback draft - instruction "${instructions}" incorporated]\n\n${body}\n\n*Special instructions added: Please address compliance directly to accounts-payable@ourcompany.com.*`;
      return res.json({ subject: subject, body: fallbackBody });
    }

    try {
      const prompt = `
You are a brilliant AI accounts payable compliance and communications helper.
The user has a draft email they want to send to their vendor "${vendorName || 'the vendor'}" regarding matching and invoice discrepancies in their GST filing.

The email consists of a Subject and a Body.

Current subject: "${subject}"
Current body:
"""
${body}
"""

User instructions/modifications for redrafting:
"${instructions}"

Task: Redraft both the subject and the body to incorporate the user's modifications cleanly, maintaining a professional business/compliance tone.
You MUST respond with a JSON object containing EXACTLY two keys: "subject" and "body".
Do NOT include any external commentary, markdown backticks, or introduction. Just return a clean, valid JSON object.

Example output:
{
  "subject": "Clarification on Outstanding Q2 GST Filings",
  "body": "Dear Finance Team..."
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const responseText = response.text ? response.text.trim() : "";
      
      try {
        const parsed = JSON.parse(responseText);
        res.json({
          subject: parsed.subject || subject,
          body: parsed.body || body
        });
      } catch (e) {
        // Fallback parse if it wasn't perfect JSON
        console.warn("Fell back to regex/manual parse for Gemini output:", responseText);
        res.json({
          subject: subject,
          body: responseText || body
        });
      }
    } catch (error: any) {
      console.error("Gemini API error during redraft:", error);
      res.status(500).json({ error: error?.message || "Failed to generate email draft" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
