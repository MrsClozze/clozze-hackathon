import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContacts } from "@/contexts/ContactsContext";
import { Users } from "lucide-react";

interface ContactSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ContactSelect({ value, onValueChange, placeholder = "Select contact...", className }: ContactSelectProps) {
  const { contacts, loading } = useContacts();

  // Group contacts by category and subcategory
  const groupedContacts = contacts.reduce((acc, contact) => {
    const category = contact.category || "Uncategorized";
    const subcategory = contact.subcategory || "Other";
    
    if (!acc[category]) {
      acc[category] = {};
    }
    if (!acc[category][subcategory]) {
      acc[category][subcategory] = [];
    }
    acc[category][subcategory].push(contact);
    return acc;
  }, {} as Record<string, Record<string, typeof contacts>>);

  const hasContacts = contacts.length > 0;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={!hasContacts}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={hasContacts ? placeholder : "Add contacts to assign"} />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading contacts...
          </div>
        ) : !hasContacts ? (
          <div className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No contacts yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first contact to start assigning.
            </p>
          </div>
        ) : (
          Object.entries(groupedContacts).map(([category, subcategories]) => (
            <SelectGroup key={category}>
              <SelectLabel className="text-xs font-bold uppercase tracking-wider text-primary mt-2">
                {category}
              </SelectLabel>
              {Object.entries(subcategories).map(([subcategory, categoryContacts]) => (
                <div key={subcategory}>
                  <SelectLabel className="text-xs font-semibold pl-4 text-muted-foreground">
                    {subcategory}
                  </SelectLabel>
                  {categoryContacts.map((contact) => (
                    <SelectItem 
                      key={contact.id} 
                      value={contact.id} 
                      className="pl-8"
                    >
                      {contact.first_name} {contact.last_name}
                      {contact.company && ` - ${contact.company}`}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectGroup>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
