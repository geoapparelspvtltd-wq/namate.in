import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug logging for environment variables (safe)
console.log("Configuration Check:");
console.log("- CASHFREE_APP_ID exists:", !!process.env.CASHFREE_APP_ID);
console.log("- CASHFREE_APP_ID length:", process.env.CASHFREE_APP_ID?.length || 0);
console.log("- CASHFREE_SECRET_KEY exists:", !!process.env.CASHFREE_SECRET_KEY);
console.log("- CASHFREE_SECRET_KEY length:", process.env.CASHFREE_SECRET_KEY?.length || 0);

// Initialize Cashfree
const appId = process.env.CASHFREE_APP_ID?.trim() || "";
const secretKey = process.env.CASHFREE_SECRET_KEY?.trim() || "";

const cashfree = new Cashfree(
  process.env.NODE_ENV === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
  appId,
  secretKey
);

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route: Create Cashfree Order
  app.post("/api/cashfree/order", async (req, res) => {
    console.log("=== Cashfree Order Request ===");
    try {
      const { amount, customer_id, customer_phone, customer_email, customer_name } = req.body;
      
      if (!appId || !secretKey) {
        return res.status(400).json({ 
          error: "Cashfree credentials not found. Please add CASHFREE_APP_ID and CASHFREE_SECRET_KEY in the Settings menu."
        });
      }
      
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount provided." });
      }

      const request = {
        order_amount: numericAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: customer_id || `cust_${Date.now()}`,
          customer_phone: customer_phone || "9999999999",
          customer_name: customer_name || "Customer",
          customer_email: customer_email || "test@example.com"
        },
        order_meta: {
          return_url: `${req.headers.origin}/profile?order_id={order_id}`,
        },
      };

      try {
        const response = await cashfree.PGCreateOrder(request);
        console.log("Cashfree Order created successfully:", response.data.order_id);
        res.json(response.data);
      } catch (cfError: any) {
        console.error("Cashfree SDK Error:", cfError.response?.data || cfError.message);
        res.status(400).json({
          error: "Cashfree rejected the order creation.",
          details: cfError.response?.data?.message || cfError.message || "Unknown Cashfree error"
        });
      }
    } catch (error: any) {
      console.error("Global API Error:", error);
      res.status(500).json({ 
        error: "Internal server error during order creation.",
        details: error.message
      });
    }
  });

  // API Route: Gemini Trial Room (Photorealistic)
  app.post("/api/gemini/cartoonify", async (req, res) => {
    console.log("=== Gemini Trial Room Start ===");
    try {
      const { image, productImage, prompt } = req.body;
      
      if (!image && !prompt) {
        return res.status(400).json({ error: "Missing image or prompt." });
      }

      if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is missing from environment.");
        return res.status(400).json({ error: "Gemini API key not configured. Please check Settings > Secrets." });
      }

      const contentsParts: any[] = [];

      // Add User Identity Image
      if (image) {
        const base64Data = image.includes(",") ? image.split(",")[1] : image;
        contentsParts.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        });
      }

      // Add Product Image Reference
      if (productImage) {
        const productBase64 = productImage.includes(",") ? productImage.split(",")[1] : productImage;
        contentsParts.push({
          inlineData: {
            data: productBase64,
            mimeType: "image/jpeg"
          }
        });
      }

      // Construct refined photorealistic prompt
      const systemPrompt = productImage 
        ? "PHOTOREALISTIC VIRTUAL TRY-ON. Look at the FIRST image (the person) and the SECOND image (the product). Generate a high-quality studio photograph of the person from the first image WEARING the IDENTICAL apparel shown in the second image. CRITICAL: Replicate the EXACT COLOR (hue, saturation, brightness) and the EXACT PATTERN/TEXTURE from the product image. The garment on the person must be a perfect visual match to the product provided. Maintain 100% fidelity to the person's facial features and identity. 8k resolution, professional studio lighting."
        : "Generate a photorealistic, high-quality image of the person in the source photo. Maintain their EXACT facial features, hair, and identity. The output should look like a real professional photograph, NOT a cartoon. High resolution, natural lighting, studio quality.";

      contentsParts.push({
        text: `${systemPrompt} Additional details: ${prompt || ""}`
      });

      console.log("Calling Gemini with model: gemini-2.5-flash-image");
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts: contentsParts },
      });

      if (!response.candidates?.[0]) {
        console.error("Gemini Response has no candidates:", JSON.stringify(response));
        return res.status(500).json({ error: "The AI model returned no results. This might be due to content safety filters or model availability." });
      }

      let resultBase64 = "";
      const parts = response.candidates[0].content?.parts || [];
      console.log(`Received ${parts.length} parts from Gemini.`);

      for (const part of parts) {
        if (part.inlineData) {
          resultBase64 = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (resultBase64) {
        console.log("Successfully generated realistic image.");
        res.json({ image: resultBase64 });
      } else {
        console.error("No inlineData found in Gemini response parts.");
        const refusalText = parts.find(p => p.text)?.text;
        res.status(500).json({ 
          error: "Failed to generate image. The model didn't return an image.",
          details: refusalText || "No additional information provided by the model."
        });
      }
    } catch (error: any) {
      console.error("Gemini API Error Detail:", error);
      res.status(500).json({ 
        error: "Internal Gemini API error.",
        details: error.message || String(error)
      });
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
