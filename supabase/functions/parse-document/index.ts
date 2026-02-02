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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText, documentType } = await req.json();
    
    if (!documentText || typeof documentText !== "string") {
      return new Response(
        JSON.stringify({ error: "Document text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!documentType || !["listing", "buyer"].includes(documentType)) {
      return new Response(
        JSON.stringify({ error: "Document type must be 'listing' or 'buyer'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the extraction prompt based on document type
    const systemPrompt = documentType === "listing" 
      ? `You are a real estate document parser. Extract ONLY listing/property information from the provided document.
         Focus on finding: seller details (name, email, phone), property address, city, zipcode, county, 
         bedrooms, bathrooms, square footage, listing price, appraisal price, whether it's multi-unit,
         listing dates, brokerage information, and commission details.
         
         IMPORTANT: 
         - Extract ONLY the seller/property owner information, NOT buyer information
         - DO NOT GUESS. If a field is not explicitly present in the document text, return null for that field.
         - If you are unsure between multiple values, return null.
         - Return numeric values as strings (e.g., "450000" not 450000)
         - For dates, use YYYY-MM-DD format
         - For phone numbers, include the formatting as found in the document`
      : `You are a real estate document parser. Extract ONLY buyer/client information from the provided document.
         Focus on finding: buyer details (name, email, phone), pre-approved loan amount, 
         wants/needs/requirements, brokerage information, and commission details.
         
         IMPORTANT:
         - Extract ONLY the buyer/client information, NOT seller or property information
         - DO NOT GUESS. If a field is not explicitly present in the document text, return null for that field.
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
            "sellerFirstName",
            "sellerLastName",
            "sellerEmail",
            "sellerPhone",
            "address",
            "city",
            "zipcode",
            "county",
            "bedrooms",
            "bathrooms",
            "sqFeet",
            "listingPrice",
            "appraisalPrice",
            "multiUnit",
            "listingStartDate",
            "listingEndDate",
            "brokerageName",
            "brokerageAddress",
            "agentEmail",
            "commissionPercentage",
          ],
          additionalProperties: false,
        }
      : {
          type: "object",
          properties: {
            buyerFirstName: { type: ["string", "null"], description: "Buyer's first name" },
            buyerLastName: { type: ["string", "null"], description: "Buyer's last name" },
            buyerEmail: { type: ["string", "null"], description: "Buyer's email address" },
            buyerPhone: { type: ["string", "null"], description: "Buyer's phone number" },
            preApprovedAmount: { type: ["string", "null"], description: "Pre-approved loan amount without currency symbols" },
            wantsNeeds: { type: ["string", "null"], description: "Buyer's requirements, wants, and needs for a property" },
            brokerageName: { type: ["string", "null"], description: "Brokerage company name" },
            brokerageAddress: { type: ["string", "null"], description: "Brokerage address" },
            agentEmail: { type: ["string", "null"], description: "Agent email address" },
            commissionPercentage: { type: ["string", "null"], description: "Commission percentage as a number" },
          },
          required: [
            "buyerFirstName",
            "buyerLastName",
            "buyerEmail",
            "buyerPhone",
            "preApprovedAmount",
            "wantsNeeds",
            "brokerageName",
            "brokerageAddress",
            "agentEmail",
            "commissionPercentage",
          ],
          additionalProperties: false,
        };

    const functionName = documentType === "listing" ? "extract_listing_data" : "extract_buyer_data";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract the ${documentType} information from this document:\n\n${documentText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: functionName,
              description: `Extract ${documentType} data from the real estate document`,
              parameters: extractionSchema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: functionName } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: cleanedData,
        documentType 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-document error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to parse document" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
