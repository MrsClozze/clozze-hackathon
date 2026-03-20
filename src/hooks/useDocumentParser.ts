import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractDocumentText } from "@/lib/documentTextExtractors";

interface ListingFormData {
  sellerFirstName: string;
  sellerLastName: string;
  sellerEmail: string;
  sellerPhone: string;
  address: string;
  city: string;
  zipcode: string;
  county: string;
  bedrooms: string;
  bathrooms: string;
  sqFeet: string;
  listingPrice: string;
  appraisalPrice: string;
  multiUnit: string;
  listingStartDate: string;
  listingEndDate: string;
  description: string;
  brokerageName: string;
  brokerageAddress: string;
  agentEmail: string;
  commissionPercentage: string;
}

interface BuyerFormData {
  buyerFirstName: string;
  buyerLastName: string;
  buyerEmail: string;
  buyerPhone: string;
  preApprovedAmount: string;
  wantsNeeds: string;
  brokerageName: string;
  brokerageAddress: string;
  agentEmail: string;
  commissionPercentage: string;
}

export type DetectedDocumentType = "listing" | "buyer" | "unrecognized";

interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  detectedType?: DetectedDocumentType;
}

interface DetectResult {
  detectedType: DetectedDocumentType;
  confidence: string;
  reason: string;
}

export function useDocumentParser() {
  const [isParsing, setIsParsing] = useState(false);
  const { toast } = useToast();

  const prepareAiInput = (text: string) => {
    const max = 15_000;
    if (text.length <= max) return text;
    const head = text.slice(0, 9_000);
    const tail = text.slice(-6_000);
    return `${head}\n\n--- [content truncated] ---\n\n${tail}`;
  };

  const detectDocumentType = async (file: File): Promise<DetectResult> => {
    const documentText = prepareAiInput(await extractDocumentText(file));
    
    if (!documentText || documentText.length < 20) {
      return { detectedType: "unrecognized", confidence: "low", reason: "Not enough text content" };
    }

    const { data, error } = await supabase.functions.invoke('parse-document', {
      body: { documentText, action: 'detect' }
    });

    if (error || !data?.success) {
      console.error("Document detection error:", error || data?.error);
      return { detectedType: "unrecognized", confidence: "low", reason: "Detection failed" };
    }

    return {
      detectedType: data.detectedType as DetectedDocumentType,
      confidence: data.confidence,
      reason: data.reason,
    };
  };

  const parseListingDocument = async (file: File): Promise<ParseResult<ListingFormData>> => {
    setIsParsing(true);
    
    try {
      const documentText = prepareAiInput(await extractDocumentText(file));
      
      if (!documentText || documentText.length < 20) {
        throw new Error("Could not extract enough text from the document. Please ensure the file contains readable text.");
      }

      const { data, error } = await supabase.functions.invoke('parse-document', {
        body: { documentText, documentType: 'listing' }
      });

      if (error) throw new Error(error.message || "Failed to parse document");
      if (!data.success) throw new Error(data.error || "Failed to extract listing information");

      const formData: ListingFormData = {
        sellerFirstName: data.data.sellerFirstName || "",
        sellerLastName: data.data.sellerLastName || "",
        sellerEmail: data.data.sellerEmail || "",
        sellerPhone: data.data.sellerPhone || "",
        address: data.data.address || "",
        city: data.data.city || "",
        zipcode: data.data.zipcode || "",
        county: data.data.county || "",
        bedrooms: data.data.bedrooms || "",
        bathrooms: data.data.bathrooms || "",
        sqFeet: data.data.sqFeet || "",
        listingPrice: data.data.listingPrice || "",
        appraisalPrice: data.data.appraisalPrice || "",
        multiUnit: data.data.multiUnit || "no",
        listingStartDate: data.data.listingStartDate || "",
        listingEndDate: data.data.listingEndDate || "",
        description: data.data.description || "",
        brokerageName: data.data.brokerageName || "",
        brokerageAddress: data.data.brokerageAddress || "",
        agentEmail: data.data.agentEmail || "",
        commissionPercentage: data.data.commissionPercentage || "",
      };

      return { success: true, data: formData };
    } catch (error) {
      console.error("Document parsing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to parse document";
      toast({ title: "Parsing Error", description: errorMessage, variant: "destructive" });
      return { success: false, error: errorMessage };
    } finally {
      setIsParsing(false);
    }
  };

  const parseBuyerDocument = async (file: File): Promise<ParseResult<BuyerFormData>> => {
    setIsParsing(true);
    
    try {
      const documentText = prepareAiInput(await extractDocumentText(file));
      
      if (!documentText || documentText.length < 20) {
        throw new Error("Could not extract enough text from the document. Please ensure the file contains readable text.");
      }

      const { data, error } = await supabase.functions.invoke('parse-document', {
        body: { documentText, documentType: 'buyer' }
      });

      if (error) throw new Error(error.message || "Failed to parse document");
      if (!data.success) throw new Error(data.error || "Failed to extract buyer information");

      const formData: BuyerFormData = {
        buyerFirstName: data.data.buyerFirstName || "",
        buyerLastName: data.data.buyerLastName || "",
        buyerEmail: data.data.buyerEmail || "",
        buyerPhone: data.data.buyerPhone || "",
        preApprovedAmount: data.data.preApprovedAmount || "",
        wantsNeeds: data.data.wantsNeeds || "",
        brokerageName: data.data.brokerageName || "",
        brokerageAddress: data.data.brokerageAddress || "",
        agentEmail: data.data.agentEmail || "",
        commissionPercentage: data.data.commissionPercentage || "",
      };

      return { success: true, data: formData };
    } catch (error) {
      console.error("Document parsing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to parse document";
      toast({ title: "Parsing Error", description: errorMessage, variant: "destructive" });
      return { success: false, error: errorMessage };
    } finally {
      setIsParsing(false);
    }
  };

  /**
   * Auto-detect document type, then parse accordingly.
   * Returns detectedType = "unrecognized" if the doc doesn't match listing or buyer agreements.
   */
  const detectAndParse = async (file: File): Promise<ParseResult<ListingFormData | BuyerFormData>> => {
    setIsParsing(true);
    try {
      const detection = await detectDocumentType(file);
      console.log("[useDocumentParser] Detection result:", detection);

      if (detection.detectedType === "unrecognized") {
        return { success: false, detectedType: "unrecognized", error: detection.reason };
      }

      if (detection.detectedType === "listing") {
        const result = await parseListingDocument(file);
        return { ...result, detectedType: "listing" };
      }

      if (detection.detectedType === "buyer") {
        const result = await parseBuyerDocument(file);
        return { ...result, detectedType: "buyer" };
      }

      return { success: false, detectedType: "unrecognized", error: "Unknown document type" };
    } catch (error) {
      console.error("Detect and parse error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process document";
      return { success: false, error: errorMessage };
    } finally {
      setIsParsing(false);
    }
  };

  return {
    isParsing,
    parseListingDocument,
    parseBuyerDocument,
    detectAndParse,
  };
}
