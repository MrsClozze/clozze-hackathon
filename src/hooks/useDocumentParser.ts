import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

type DocumentType = "listing" | "buyer";

interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useDocumentParser() {
  const [isParsing, setIsParsing] = useState(false);
  const { toast } = useToast();

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For now, we'll read the file as text for simple text files
    // For PDFs and DOCs, we'll need to extract text differently
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'txt') {
      return await file.text();
    }
    
    // For PDF and DOC files, we read as text and hope it contains readable content
    // In production, you might want to use a PDF parsing library or service
    try {
      const text = await file.text();
      // If the text looks like binary garbage, return a message
      if (text.includes('\x00') || text.includes('�')) {
        // Try to extract any readable text patterns
        const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        if (readableText.length < 50) {
          throw new Error("Unable to extract text from this file format. Please copy and paste the document text or use a text file.");
        }
        return readableText;
      }
      return text;
    } catch (error) {
      console.error("Error reading file:", error);
      throw new Error("Unable to read file. Please try a different format or paste the text directly.");
    }
  };

  const parseListingDocument = async (file: File): Promise<ParseResult<ListingFormData>> => {
    setIsParsing(true);
    
    try {
      const documentText = await extractTextFromFile(file);
      
      if (!documentText || documentText.length < 20) {
        throw new Error("Could not extract enough text from the document. Please ensure the file contains readable text.");
      }

      const { data, error } = await supabase.functions.invoke('parse-document', {
        body: { 
          documentText,
          documentType: 'listing'
        }
      });

      if (error) {
        throw new Error(error.message || "Failed to parse document");
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to extract listing information");
      }

      // Map the response to form data, using empty strings for null values
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
        brokerageName: data.data.brokerageName || "",
        brokerageAddress: data.data.brokerageAddress || "",
        agentEmail: data.data.agentEmail || "",
        commissionPercentage: data.data.commissionPercentage || "",
      };

      return { success: true, data: formData };
    } catch (error) {
      console.error("Document parsing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to parse document";
      toast({
        title: "Parsing Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsParsing(false);
    }
  };

  const parseBuyerDocument = async (file: File): Promise<ParseResult<BuyerFormData>> => {
    setIsParsing(true);
    
    try {
      const documentText = await extractTextFromFile(file);
      
      if (!documentText || documentText.length < 20) {
        throw new Error("Could not extract enough text from the document. Please ensure the file contains readable text.");
      }

      const { data, error } = await supabase.functions.invoke('parse-document', {
        body: { 
          documentText,
          documentType: 'buyer'
        }
      });

      if (error) {
        throw new Error(error.message || "Failed to parse document");
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to extract buyer information");
      }

      // Map the response to form data, using empty strings for null values
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
      toast({
        title: "Parsing Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsParsing(false);
    }
  };

  return {
    isParsing,
    parseListingDocument,
    parseBuyerDocument,
  };
}
