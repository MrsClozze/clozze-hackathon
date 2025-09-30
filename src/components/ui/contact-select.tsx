import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContactSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Mock contacts data - would be replaced with actual data from API/context
const contactsData = {
  clients: [
    { id: "client-1", name: "Sarah Johnson" },
    { id: "client-2", name: "Michael Chen" },
    { id: "client-3", name: "Emily Rodriguez" },
  ],
  corePartners: {
    lenders: [
      { id: "lender-1", name: "First National Bank - John Doe" },
      { id: "lender-2", name: "Premier Mortgage - Jane Smith" },
    ],
    titleEscrow: [
      { id: "title-1", name: "Secure Title Co. - Robert Brown" },
      { id: "title-2", name: "Premier Escrow - Lisa White" },
    ],
    appraisers: [
      { id: "appraiser-1", name: "Property Value Experts - Tom Wilson" },
    ],
    inspectors: [
      { id: "inspector-1", name: "HomeSafe Inspections - Mike Davis" },
    ],
    attorneys: [
      { id: "attorney-1", name: "Legal Partners LLC - Susan Martinez" },
    ],
  },
  homePreparation: {
    stagers: [
      { id: "stager-1", name: "Elegant Staging - Amanda Lee" },
    ],
    contractors: [
      { id: "contractor-1", name: "BuildRight Co. - James Anderson" },
    ],
    painters: [
      { id: "painter-1", name: "Perfect Paint - David Garcia" },
    ],
    roofing: [
      { id: "roof-1", name: "TopRoof Services - Chris Taylor" },
    ],
    landscaping: [
      { id: "landscape-1", name: "Green Gardens - Maria Lopez" },
    ],
    cleaning: [
      { id: "clean-1", name: "Sparkle Clean - Rachel Kim" },
    ],
    photography: [
      { id: "photo-1", name: "ProShot Real Estate - Alex Johnson" },
    ],
  },
  homeWarranty: {
    homeInsurance: [
      { id: "ins-1", name: "SafeHome Insurance - Kevin Brown" },
    ],
    floodFire: [
      { id: "flood-1", name: "Disaster Protection Inc. - Nancy White" },
    ],
  },
  movingSetup: {
    moving: [
      { id: "move-1", name: "EasyMove Services - Tom Harris" },
    ],
    storage: [
      { id: "storage-1", name: "SecureStore - Patricia Miller" },
    ],
    utilities: [
      { id: "utility-1", name: "QuickConnect - Brian Wilson" },
    ],
    security: [
      { id: "security-1", name: "HomeSafe Security - Jennifer Davis" },
    ],
  },
  financialLegal: {
    cpa: [
      { id: "cpa-1", name: "Tax Advisors Group - Richard Chen" },
    ],
    exchange1031: [
      { id: "1031-1", name: "Exchange Intermediary Co. - Linda Moore" },
    ],
    notary: [
      { id: "notary-1", name: "Notary Services - Mark Thompson" },
    ],
    hoa: [
      { id: "hoa-1", name: "Community HOA - Karen Martinez" },
    ],
  },
};

export function ContactSelect({ value, onValueChange, placeholder = "Select contact...", className }: ContactSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {/* Clients */}
        <SelectGroup>
          <SelectLabel className="text-xs font-bold uppercase tracking-wider text-primary">Clients</SelectLabel>
          {contactsData.clients.map((contact) => (
            <SelectItem key={contact.id} value={contact.name}>
              {contact.name}
            </SelectItem>
          ))}
        </SelectGroup>

        {/* Core Partners */}
        <SelectGroup>
          <SelectLabel className="text-xs font-bold uppercase tracking-wider text-primary mt-2">Core Partners</SelectLabel>
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Lenders / Financing</SelectLabel>
          {contactsData.corePartners.lenders.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Title & Escrow</SelectLabel>
          {contactsData.corePartners.titleEscrow.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Appraisers</SelectLabel>
          {contactsData.corePartners.appraisers.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Home Inspectors</SelectLabel>
          {contactsData.corePartners.inspectors.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Attorneys</SelectLabel>
          {contactsData.corePartners.attorneys.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
        </SelectGroup>

        {/* Home Preparation */}
        <SelectGroup>
          <SelectLabel className="text-xs font-bold uppercase tracking-wider text-primary mt-2">Home Preparation</SelectLabel>
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Stagers & Designers</SelectLabel>
          {contactsData.homePreparation.stagers.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Contractors</SelectLabel>
          {contactsData.homePreparation.contractors.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Painters & Flooring</SelectLabel>
          {contactsData.homePreparation.painters.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Roof & Exterior</SelectLabel>
          {contactsData.homePreparation.roofing.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Landscaping</SelectLabel>
          {contactsData.homePreparation.landscaping.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Cleaning</SelectLabel>
          {contactsData.homePreparation.cleaning.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Photography & Videography</SelectLabel>
          {contactsData.homePreparation.photography.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
        </SelectGroup>

        {/* Home Warranty */}
        <SelectGroup>
          <SelectLabel className="text-xs font-bold uppercase tracking-wider text-primary mt-2">Insurance & Protection</SelectLabel>
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Home Insurance</SelectLabel>
          {contactsData.homeWarranty.homeInsurance.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Flood & Fire Insurance</SelectLabel>
          {contactsData.homeWarranty.floodFire.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
        </SelectGroup>

        {/* Moving & Setup */}
        <SelectGroup>
          <SelectLabel className="text-xs font-bold uppercase tracking-wider text-primary mt-2">Moving & Setup</SelectLabel>
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Moving</SelectLabel>
          {contactsData.movingSetup.moving.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Storage</SelectLabel>
          {contactsData.movingSetup.storage.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Utilities & Internet</SelectLabel>
          {contactsData.movingSetup.utilities.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Home Security</SelectLabel>
          {contactsData.movingSetup.security.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
        </SelectGroup>

        {/* Financial & Legal Extras */}
        <SelectGroup>
          <SelectLabel className="text-xs font-bold uppercase tracking-wider text-primary mt-2">Financial & Legal Extras</SelectLabel>
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">CPA & Tax Advisors</SelectLabel>
          {contactsData.financialLegal.cpa.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">1031 Exchange Intermediaries</SelectLabel>
          {contactsData.financialLegal.exchange1031.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">Notary</SelectLabel>
          {contactsData.financialLegal.notary.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
          <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">HOA Contacts</SelectLabel>
          {contactsData.financialLegal.hoa.map((contact) => (
            <SelectItem key={contact.id} value={contact.name} className="pl-8">
              {contact.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}