import { useState, useEffect, useMemo } from "react";
import { useContacts, Contact } from "@/contexts/ContactsContext";
import { useTasks } from "@/contexts/TasksContext";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import ContactCard from "@/components/contacts/ContactCard";
import AddContactModal from "@/components/contacts/AddContactModal";

interface ProfileContactsTabProps {
  recordType: "buyer" | "listing";
  recordId: string;
}

export default function ProfileContactsTab({ recordType, recordId }: ProfileContactsTabProps) {
  const { contacts, deleteContact } = useContacts();
  const { tasks } = useTasks();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();

  // Get contact IDs from tasks associated with this buyer/listing
  const taskContactIds = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach((task) => {
      const match = recordType === "buyer" ? task.buyerId === recordId : task.listingId === recordId;
      if (match && task.contactId) {
        ids.add(task.contactId);
      }
    });
    return ids;
  }, [tasks, recordType, recordId]);

  // Show contacts that are linked via tasks to this profile
  const profileContacts = useMemo(() => {
    return contacts.filter((c) => taskContactIds.has(c.id));
  }, [contacts, taskContactIds]);

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

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-heading">Associated Contacts</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {profileContacts.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-40 mb-3" />
          <p className="text-sm text-text-muted font-medium">No contacts yet</p>
          <p className="text-xs text-text-muted mt-1">
            Add a contact directly, or assign one to a task — they'll appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profileContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddContactModal
        open={addModalOpen}
        onOpenChange={handleModalClose}
        editContact={editingContact}
      />
    </div>
  );
}
