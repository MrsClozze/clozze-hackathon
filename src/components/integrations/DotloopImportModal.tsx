 import { useState, useEffect } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Loader2, User, Home, Check, AlertCircle, ExternalLink } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useNavigate } from "react-router-dom";
 
 interface DotloopImportModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   importType: "buyer" | "listing";
   onImport: (data: any) => void;
 }
 
 interface DotloopLoop {
   id: number;
   name: string;
   status: string;
   transactionType: string;
   profileId: number;
 }
 
 interface DotloopContact {
   id: number;
   firstName: string;
   lastName: string;
   email: string;
   phone?: string;
 }
 
 export function DotloopImportModal({
   open,
   onOpenChange,
   importType,
   onImport,
 }: DotloopImportModalProps) {
   const [loading, setLoading] = useState(true);
   const [loops, setLoops] = useState<DotloopLoop[]>([]);
   const [contacts, setContacts] = useState<DotloopContact[]>([]);
   const [selectedItem, setSelectedItem] = useState<number | null>(null);
   const [error, setError] = useState<string | null>(null);
   const { toast } = useToast();
   const navigate = useNavigate();
 
   useEffect(() => {
     if (open) {
       fetchDotloopData();
     }
   }, [open]);
 
   const fetchDotloopData = async () => {
     setLoading(true);
     setError(null);
     setSelectedItem(null);
 
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         setError("Please sign in to continue");
         setLoading(false);
         return;
       }
 
       const response = await supabase.functions.invoke("sync-dotloop", {
         body: { action: "sync_all" },
         headers: {
           Authorization: `Bearer ${session.access_token}`,
         },
       });
 
       if (response.error) {
         throw new Error(response.error.message);
       }
 
       const { data } = response.data;
       
       if (importType === "listing") {
        // Show all loops - users can select any loop to import
        setLoops(data.loops || []);
       } else {
         // For buyers, show contacts
         setContacts(data.contacts || []);
       }
     } catch (err) {
       console.error("Error fetching Dotloop data:", err);
       const message = err instanceof Error ? err.message : "Failed to fetch data";
       
       if (message.includes("not connected")) {
         setError("Dotloop is not connected. Please connect it first in Integrations.");
       } else {
         setError(message);
       }
     } finally {
       setLoading(false);
     }
   };
 
   const handleImport = () => {
     if (importType === "listing" && selectedItem !== null) {
       const loop = loops.find((l) => l.id === selectedItem);
       if (loop) {
         // Map Dotloop loop to listing form data
         onImport({
           address: loop.name || "",
           // Additional fields would be populated from loop details API
         });
         toast({
           title: "Loop imported",
           description: `Imported "${loop.name}" from Dotloop`,
         });
         onOpenChange(false);
       }
     } else if (importType === "buyer" && selectedItem !== null) {
       const contact = contacts.find((c) => c.id === selectedItem);
       if (contact) {
         onImport({
           buyerFirstName: contact.firstName || "",
           buyerLastName: contact.lastName || "",
           buyerEmail: contact.email || "",
           buyerPhone: contact.phone || "",
         });
         toast({
           title: "Contact imported",
           description: `Imported ${contact.firstName} ${contact.lastName} from Dotloop`,
         });
         onOpenChange(false);
       }
     }
   };
 
   const handleGoToIntegrations = () => {
     onOpenChange(false);
     navigate("/integrations");
   };
 
   const items = importType === "listing" ? loops : contacts;
   const hasItems = items.length > 0;
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle>
             Import from Dotloop
           </DialogTitle>
           <DialogDescription>
             {importType === "listing"
               ? "Select a loop to import as a listing"
               : "Select a contact to import as a buyer"}
           </DialogDescription>
         </DialogHeader>
 
         <div className="py-4">
           {loading ? (
             <div className="flex flex-col items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
               <p className="text-sm text-muted-foreground">
                 Loading from Dotloop...
               </p>
             </div>
           ) : error ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
               <AlertCircle className="h-10 w-10 text-destructive mb-4" />
               <p className="text-sm text-destructive mb-4">{error}</p>
               {error.includes("not connected") && (
                 <Button onClick={handleGoToIntegrations} variant="outline">
                   <ExternalLink className="h-4 w-4 mr-2" />
                   Go to Integrations
                 </Button>
               )}
             </div>
           ) : !hasItems ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
               <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                 {importType === "listing" ? (
                   <Home className="h-6 w-6 text-muted-foreground" />
                 ) : (
                   <User className="h-6 w-6 text-muted-foreground" />
                 )}
               </div>
               <p className="text-sm text-muted-foreground">
                 No {importType === "listing" ? "loops" : "contacts"} found in Dotloop
               </p>
             </div>
           ) : (
             <ScrollArea className="h-[300px] pr-4">
               <div className="space-y-2">
                 {importType === "listing"
                   ? loops.map((loop) => (
                       <button
                         key={loop.id}
                         onClick={() => setSelectedItem(loop.id)}
                         className={`w-full text-left p-3 rounded-lg border transition-all ${
                           selectedItem === loop.id
                             ? "border-primary bg-primary/10"
                             : "border-border hover:border-primary/50 hover:bg-muted/50"
                         }`}
                       >
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <Home className="h-4 w-4 text-muted-foreground" />
                             <div>
                               <p className="font-medium text-sm">{loop.name}</p>
                               <p className="text-xs text-muted-foreground">
                                 {loop.status} • {loop.transactionType || "Transaction"}
                               </p>
                             </div>
                           </div>
                           {selectedItem === loop.id && (
                             <Check className="h-4 w-4 text-primary" />
                           )}
                         </div>
                       </button>
                     ))
                   : contacts.map((contact) => (
                       <button
                         key={contact.id}
                         onClick={() => setSelectedItem(contact.id)}
                         className={`w-full text-left p-3 rounded-lg border transition-all ${
                           selectedItem === contact.id
                             ? "border-primary bg-primary/10"
                             : "border-border hover:border-primary/50 hover:bg-muted/50"
                         }`}
                       >
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <User className="h-4 w-4 text-muted-foreground" />
                             <div>
                               <p className="font-medium text-sm">
                                 {contact.firstName} {contact.lastName}
                               </p>
                               <p className="text-xs text-muted-foreground">
                                 {contact.email || "No email"}
                               </p>
                             </div>
                           </div>
                           {selectedItem === contact.id && (
                             <Check className="h-4 w-4 text-primary" />
                           )}
                         </div>
                       </button>
                     ))}
               </div>
             </ScrollArea>
           )}
         </div>
 
         {!loading && !error && hasItems && (
           <div className="flex gap-3">
             <Button
               variant="outline"
               onClick={() => onOpenChange(false)}
               className="flex-1"
             >
               Cancel
             </Button>
             <Button
               onClick={handleImport}
               disabled={selectedItem === null}
               className="flex-1"
             >
               Import Selected
             </Button>
           </div>
         )}
       </DialogContent>
     </Dialog>
   );
 }