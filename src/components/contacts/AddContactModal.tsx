import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContacts, Contact } from "@/contexts/ContactsContext";

interface AddContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editContact?: Contact;
}

const CATEGORIES = {
  "Clients": ["Buyers", "Sellers"],
  "Core Partners": ["Lenders / Financing", "Title & Escrow", "Appraisers", "Home Inspectors", "Attorneys"],
  "Home Preparation": ["Stagers & Designers", "Contractors", "Painters & Flooring", "Roof & Exterior", "Landscaping", "Cleaning", "Photography & Videography"],
  "Insurance & Protection": ["Home Insurance", "Flood & Fire Insurance"],
  "Moving & Setup": ["Moving", "Storage", "Utilities & Internet", "Home Security"],
  "Financial & Legal Extras": ["CPA & Tax Advisors", "1031 Exchange Intermediaries", "Notary", "HOA Contacts"],
};

export default function AddContactModal({ open, onOpenChange, editContact }: AddContactModalProps) {
  const { addContact, updateContact } = useContacts();
  const [formData, setFormData] = useState({
    first_name: editContact?.first_name || "",
    last_name: editContact?.last_name || "",
    email: editContact?.email || "",
    phone: editContact?.phone || "",
    company: editContact?.company || "",
    category: editContact?.category || "",
    subcategory: editContact?.subcategory || "",
    notes: editContact?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editContact) {
      await updateContact(editContact.id, formData);
    } else {
      await addContact(formData);
    }
    
    onOpenChange(false);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      category: "",
      subcategory: "",
      notes: "",
    });
  };

  const subcategories = formData.category ? CATEGORIES[formData.category as keyof typeof CATEGORIES] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: "" })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subcategory">Subcategory *</Label>
              <Select
                value={formData.subcategory}
                onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                disabled={!formData.category}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((subcat) => (
                    <SelectItem key={subcat} value={subcat}>
                      {subcat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editContact ? "Update Contact" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}