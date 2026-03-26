import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ListingData {
  sellerFirstName: string | null;
  sellerLastName: string | null;
  sellerEmail: string | null;
  sellerPhone: string | null;
  address: string | null;
  city: string | null;
  zipcode: string | null;
  county: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  sqFeet: string | null;
  listingPrice: string | null;
  appraisalPrice: string | null;
  multiUnit: string | null;
  listingStartDate: string | null;
  listingEndDate: string | null;
  brokerageName: string | null;
  brokerageAddress: string | null;
  agentEmail: string | null;
  commissionPercentage: string | null;
}

interface BuyerData {
  buyerFirstName: string | null;
  buyerLastName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  preApprovedAmount: string | null;
  wantsNeeds: string | null;
  brokerageName: string | null;
  brokerageAddress: string | null;
  agentEmail: string | null;
  commissionPercentage: string | null;
}

async function callAI(apiKey: string, messages: any[], tools?: any[], toolChoice?: any) {
  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages,
  };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw { status: 429, message: "Rate limit exceeded. Please try again in a moment." };
    }
    if (response.status === 402) {
      throw { status: 402, message: "AI credits exhausted. Please add credits to continue." };
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw { status: response.status, message: `AI gateway error: ${response.status}` };
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText, documentType, action } = await req.json();
    
    if (!documentText || typeof documentText !== "string") {
      return new Response(
        JSON.stringify({ error: "Document text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AI_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // ── DETECT MODE ──
    // Auto-detect document type from content
    if (action === "detect") {
      const detectResponse = await callAI(
        LOVABLE_API_KEY,
        [
          {
            role: "system",
            content: `You are a real estate document classifier. Analyze the document text and determine what type of real estate document it is.

Classify the document into ONE of these categories:
- "listing" — if it is a Residential Listing Agreement, Exclusive Right to Sell, or similar listing contract between a seller/owner and a brokerage/agent to list a property for sale.
- "buyer" — if it is a Buyer Representation Agreement, Buyer Agency Agreement, Buyer Broker Agreement, or similar contract between a buyer/client and a brokerage/agent for buyer representation services.
- "unrecognized" — if the document does not clearly fit either category above. This includes purchase agreements, inspection reports, closing documents, general contracts, or any document that is NOT specifically a listing agreement or buyer representation agreement.

IMPORTANT:
- Look at the TITLE and HEADING of the document first.
- Look for key phrases like "Exclusive Right to Sell", "Listing Agreement", "Buyer Representation", "Buyer Agency", "Buyer Broker".
- A purchase agreement is NOT a listing agreement and NOT a buyer representation agreement.
- If you are not confident, return "unrecognized".`,
          },
          {
            role: "user",
            content: `Classify this document:\n\n${documentText.slice(0, 5000)}`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "classify_document",
              description: "Classify the real estate document type",
              parameters: {
                type: "object",
                properties: {
                  documentType: {
                    type: "string",
                    enum: ["listing", "buyer", "unrecognized"],
                    description: "The detected document type",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "How confident the classification is",
                  },
                  reason: {
                    type: "string",
                    description: "Brief reason for the classification",
                  },
                },
                required: ["documentType", "confidence", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "classify_document" } }
      );

      const toolCall = detectResponse.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        throw new Error("Unexpected AI response format during detection");
      }

      const classification = JSON.parse(toolCall.function.arguments);
      console.log("[parse-document] Document classification:", JSON.stringify(classification));

      // If confidence is low, mark as unrecognized
      if (classification.confidence === "low") {
        classification.documentType = "unrecognized";
      }

      return new Response(
        JSON.stringify({
          success: true,
          detectedType: classification.documentType,
          confidence: classification.confidence,
          reason: classification.reason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── EXTRACT MODE ──
    if (!documentType || !["listing", "buyer"].includes(documentType)) {
      return new Response(
        JSON.stringify({ error: "Document type must be 'listing' or 'buyer'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the extraction prompt based on document type
    const systemPrompt = documentType === "listing" 
      ? `You are a real estate document parser. Extract ONLY listing/property information from the provided document.
         Focus on finding: seller details (name, email, phone), property address, city, zipcode, county, 
         bedrooms, bathrooms, square footage, listing price, appraisal price, whether it's multi-unit,
         listing dates, brokerage information, and commission details.
         
         IMPORTANT: 
         - Extract ONLY the seller/property owner information, NOT buyer information
         - DO NOT GUESS OR FABRICATE DATA. If a field is not explicitly present in the document text, you MUST return null for that field.
         - If you cannot find a specific piece of information, return null. Never make up names, emails, phone numbers, or any other data.
         - If you are unsure between multiple values, return null.
         - Return numeric values as strings (e.g., "450000" not 450000)
         - For dates, use YYYY-MM-DD format
         - For phone numbers, include the formatting as found in the document`
      : `You are a real estate document parser. Extract ONLY buyer/client information from a Buyer Representation Agreement or Buyer Agency Agreement.
         
         In these documents, the "Client" or "Buyer" is the person who is hiring the agent/brokerage to help them find and purchase a home.
         The "Broker" or "Agent" or "Licensee" is the real estate professional providing the service.
         
         Focus on finding:
         - The BUYER/CLIENT's name (the person buying, NOT the agent or broker)
         - The BUYER/CLIENT's email and phone number
         - Pre-approved loan amount (if mentioned)
         - Property requirements, wants, or needs (if mentioned)
         - The BROKERAGE company name (this is the company the agent works for)
         - The brokerage address
         - The AGENT's email (the licensee/agent representing the buyer)
         - Commission percentage or rate
         
         IMPORTANT:
         - The buyer/client is the CONSUMER hiring the agent. Their name usually appears near "Client", "Buyer", "Purchaser" labels.
         - DO NOT GUESS OR FABRICATE DATA. If a field is not explicitly present in the document text, you MUST return null for that field.
         - If you cannot find a buyer name, email, or phone, return null for those fields. NEVER make up names, emails, or phone numbers.
         - Many buyer agreements do NOT contain the buyer's email or phone — that is okay, just return null.
         - If you are unsure between multiple values, return null.
         - Return numeric values as strings (e.g., "450000" not 450000)
         - For phone numbers, include the formatting as found in the document`;

    const extractionSchema = documentType === "listing" 
      ? {
          type: "object",
          properties: {
            sellerFirstName: { type: ["string", "null"], description: "Seller's first name" },
            sellerLastName: { type: ["string", "null"], description: "Seller's last name" },
            sellerEmail: { type: ["string", "null"], description: "Seller's email address" },
            sellerPhone: { type: ["string", "null"], description: "Seller's phone number" },
            address: { type: ["string", "null"], description: "Property street address" },
            city: { type: ["string", "null"], description: "Property city" },
            zipcode: { type: ["string", "null"], description: "Property ZIP code" },
            county: { type: ["string", "null"], description: "Property county" },
            bedrooms: { type: ["string", "null"], description: "Number of bedrooms" },
            bathrooms: { type: ["string", "null"], description: "Number of bathrooms" },
            sqFeet: { type: ["string", "null"], description: "Square footage" },
            listingPrice: { type: ["string", "null"], description: "Listing price without currency symbols" },
            appraisalPrice: { type: ["string", "null"], description: "Appraisal price without currency symbols" },
            multiUnit: { type: ["string", "null"], description: "yes or no" },
            listingStartDate: { type: ["string", "null"], description: "Listing start date in YYYY-MM-DD format" },
            listingEndDate: { type: ["string", "null"], description: "Listing end date in YYYY-MM-DD format" },
            brokerageName: { type: ["string", "null"], description: "Brokerage company name" },
            brokerageAddress: { type: ["string", "null"], description: "Brokerage address" },
            agentEmail: { type: ["string", "null"], description: "Agent email address" },
            commissionPercentage: { type: ["string", "null"], description: "Commission percentage as a number" },
          },
          required: [
            "sellerFirstName", "sellerLastName", "sellerEmail", "sellerPhone",
            "address", "city", "zipcode", "county",
            "bedrooms", "bathrooms", "sqFeet",
            "listingPrice", "appraisalPrice", "multiUnit",
            "listingStartDate", "listingEndDate",
            "brokerageName", "brokerageAddress", "agentEmail", "commissionPercentage",
          ],
          additionalProperties: false,
        }
      : {
          type: "object",
          properties: {
            buyerFirstName: { type: ["string", "null"], description: "Buyer/Client's first name — the person HIRING the agent, NOT the agent themselves" },
            buyerLastName: { type: ["string", "null"], description: "Buyer/Client's last name — the person HIRING the agent, NOT the agent themselves" },
            buyerEmail: { type: ["string", "null"], description: "Buyer/Client's email address (return null if not found — do NOT use the agent's email)" },
            buyerPhone: { type: ["string", "null"], description: "Buyer/Client's phone number (return null if not found — do NOT use the agent's phone)" },
            preApprovedAmount: { type: ["string", "null"], description: "Pre-approved loan amount without currency symbols" },
            wantsNeeds: { type: ["string", "null"], description: "Buyer's requirements, wants, and needs for a property" },
            brokerageName: { type: ["string", "null"], description: "Brokerage company name (the company the agent works for)" },
            brokerageAddress: { type: ["string", "null"], description: "Brokerage office address" },
            agentEmail: { type: ["string", "null"], description: "The real estate agent/licensee's email address" },
            commissionPercentage: { type: ["string", "null"], description: "Commission percentage as a number" },
          },
          required: [
            "buyerFirstName", "buyerLastName", "buyerEmail", "buyerPhone",
            "preApprovedAmount", "wantsNeeds",
            "brokerageName", "brokerageAddress", "agentEmail", "commissionPercentage",
          ],
          additionalProperties: false,
        };

    const functionName = documentType === "listing" ? "extract_listing_data" : "extract_buyer_data";

    const aiResponse = await callAI(
      LOVABLE_API_KEY,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract the ${documentType} information from this document:\n\n${documentText}` },
      ],
      [
        {
          type: "function",
          function: {
            name: functionName,
            description: `Extract ${documentType} data from the real estate document. Return null for any field not explicitly found in the document — NEVER fabricate data.`,
            parameters: extractionSchema,
          },
        },
      ],
      { type: "function", function: { name: functionName } }
    );

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== functionName) {
      throw new Error("Unexpected AI response format");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    // Clean up the extracted data - replace undefined with null and clean numeric strings
    const cleanedData: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(extractedData)) {
      if (value === undefined || value === null || value === "") {
        cleanedData[key] = null;
      } else if (typeof value === "string") {
        // Clean up price/amount fields - remove currency symbols and commas
        if (key.includes("Price") || key.includes("Amount")) {
          cleanedData[key] = value.replace(/[$,]/g, "").trim();
        } else {
          cleanedData[key] = value.trim();
        }
      } else {
        cleanedData[key] = String(value);
      }
    }

    console.log(`[parse-document] Extracted ${documentType} data:`, JSON.stringify(cleanedData));

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: cleanedData,
        documentType 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("parse-document error:", error);
    const status = error.status || 500;
    const message = error.message || (error instanceof Error ? error.message : "Failed to parse document");
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
