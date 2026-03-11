import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { useContacts } from "@/contexts/ContactsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Mail, Smartphone, ChevronDown, ChevronRight } from "lucide-react";
import ContactCard from "@/components/contacts/ContactCard";
import AddContactModal from "@/components/contacts/AddContactModal";
import EmailImportModal from "@/components/contacts/EmailImportModal";
import PhoneImportModal from "@/components/contacts/PhoneImportModal";
import { Contact } from "@/contexts/ContactsContext";

const CATEGORIES = {
  "Clients": ["Buyer", "Seller", "Investor", "Landlord", "Tenant", "Past Client", "Referral Client"],
  "Core Transaction Partners": ["Mortgage Lender", "Loan Officer", "Title Company", "Escrow Officer", "Transaction Coordinator", "Co-Agent (Buyer Agent)", "Co-Agent (Listing Agent)", "Brokerage Admin"],
  "Inspection & Due Diligence": ["Home Inspector", "Pest Inspector", "Roof Inspector", "Structural Engineer", "Septic Inspector", "Well Inspector", "Radon Inspector", "Mold Inspector", "Surveyor", "Appraiser"],
  "Home Preparation": ["Photographer", "Videographer", "Drone Photographer", "Home Stager", "Interior Designer", "Handyman", "Contractor", "Painter", "Landscaper", "Cleaner", "Junk Removal"],
  "Insurance & Protection": ["Home Insurance Agent", "Flood Insurance Agent", "Title Insurance Representative", "Home Warranty Provider", "Property Protection Services"],
  "Moving & Setup": ["Moving Company", "Storage Company", "Junk Removal Service", "Utility Setup Service", "Internet Provider", "Cable Provider", "Smart Home Installation", "Locksmith"],
  "Financial & Legal": ["Real Estate Attorney", "Real Estate CPA", "Tax Advisor", "Financial Advisor", "Estate Planner", "Notary"],
  "Vendors & Property Services": ["Plumber", "Electrician", "HVAC Technician", "Appliance Technician", "Pool Service", "Pest Control", "Roofing Contractor", "Flooring Contractor", "Window Installer", "General Contractor"],
  "Marketing & Listing Services": ["Marketing Coordinator", "Social Media Manager", "Print Marketing Vendor", "Sign Installation", "Lockbox Installer", "Virtual Tour Provider", "Listing Website Provider"],
  "Internal Team": ["Team Agent", "Showing Agent", "Assistant", "Marketing Assistant", "Transaction Coordinator", "Operations Manager"],
};

export default function Contacts() {
  const { contacts, loading, deleteContact } = useContacts();
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Clients": true,
    "Core Partners": true,
    "Home Preparation": false,
    "Insurance & Protection": false,
    "Moving & Setup": false,
    "Financial & Legal Extras": false,
  });

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.first_name.toLowerCase().includes(query) ||
        contact.last_name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query) ||
        contact.category.toLowerCase().includes(query) ||
        contact.subcategory.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const contactsByCategory = useMemo(() => {
    const grouped: Record<string, Contact[]> = {};
    Object.keys(CATEGORIES).forEach((category) => {
      grouped[category] = filteredContacts.filter((c) => c.category === category);
    });
    return grouped;
  }, [filteredContacts]);

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setAddModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      await deleteContact(id);
    }
  };

  const handleModalClose = () => {
    setAddModalOpen(false);
    setEditingContact(undefined);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <p className="text-text-muted">Loading contacts...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-heading mb-2">Contacts</h1>
          <p className="text-text-muted">Manage your professional network and client contacts</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search contacts by name, email, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
          
          <Button variant="outline" onClick={() => setEmailModalOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Load Email Contacts
          </Button>
          
          <Button variant="outline" onClick={() => setPhoneModalOpen(true)}>
            <Smartphone className="h-4 w-4 mr-2" />
            Sync Phone
          </Button>
        </div>

        {/* Contact Categories */}
        <div className="space-y-4">
          {Object.entries(CATEGORIES).map(([category, subcategories]) => {
            const categoryContacts = contactsByCategory[category] || [];
            const isOpen = openCategories[category];

            return (
              <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
                <div className="rounded-lg border border-card-border bg-card">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-card-elevated transition-colors">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="h-5 w-5 text-text-muted" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-text-muted" />
                      )}
                      <h2 className="text-xl font-semibold text-text-heading">{category}</h2>
                      <span className="text-sm text-text-muted">
                        ({categoryContacts.length})
                      </span>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-4 pt-0">
                      {categoryContacts.length === 0 ? (
                        <p className="text-text-muted text-sm py-4">
                          No contacts in this category yet
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryContacts.map((contact) => (
                            <ContactCard
                              key={contact.id}
                              contact={contact}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {filteredContacts.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-text-muted">No contacts found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      <AddContactModal
        open={addModalOpen}
        onOpenChange={handleModalClose}
        editContact={editingContact}
      />
      
      <EmailImportModal open={emailModalOpen} onOpenChange={setEmailModalOpen} />
      
      <PhoneImportModal open={phoneModalOpen} onOpenChange={setPhoneModalOpen} />
    </Layout>
  );
}