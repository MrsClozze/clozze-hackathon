import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTasks } from "@/contexts/TasksContext";
import { useBuyers } from "@/contexts/BuyersContext";
import { useListings } from "@/contexts/ListingsContext";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const { addTask } = useTasks();
  const { buyers } = useBuyers();
  const { listings } = useListings();
  
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [assignmentType, setAssignmentType] = useState<"none" | "buyer" | "listing">("none");
  const [selectedBuyerId, setSelectedBuyerId] = useState("");
  const [selectedListingId, setSelectedListingId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter buyers and listings by Active/Pending status
  const activeBuyers = buyers.filter(b => b.status === "Active" || b.status === "Pending");
  const activeListings = listings.filter(l => l.status === "Active" || l.status === "Pending");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await addTask({
        title: title.trim(),
        notes: notes.trim(),
        dueDate: dueDate || undefined,
        priority,
        status: "pending",
        date: dueDate ? new Date(dueDate).toLocaleDateString() : "",
        address: "",
        assignee: "",
        hasAIAssist: false,
        buyerId: assignmentType === "buyer" ? selectedBuyerId : undefined,
        listingId: assignmentType === "listing" ? selectedListingId : undefined,
      });

      // Reset form
      setTitle("");
      setNotes("");
      setDueDate("");
      setPriority("medium");
      setAssignmentType("none");
      setSelectedBuyerId("");
      setSelectedListingId("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setNotes("");
    setDueDate("");
    setPriority("medium");
    setAssignmentType("none");
    setSelectedBuyerId("");
    setSelectedListingId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="text-text-heading">Add New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-text-heading">
              Task Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task description"
              required
              className="bg-background-elevated"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-text-heading">Priority</Label>
            <Select value={priority} onValueChange={(value: "high" | "medium" | "low") => setPriority(value)}>
              <SelectTrigger className="bg-background-elevated">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-text-heading">
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-background-elevated"
            />
          </div>

          {/* Assignment Type */}
          <div className="space-y-3">
            <Label className="text-text-heading">Assign To</Label>
            <RadioGroup value={assignmentType} onValueChange={(value: "none" | "buyer" | "listing") => {
              setAssignmentType(value);
              setSelectedBuyerId("");
              setSelectedListingId("");
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">None</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="buyer" id="buyer" />
                <Label htmlFor="buyer" className="font-normal cursor-pointer">Buyer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="listing" id="listing" />
                <Label htmlFor="listing" className="font-normal cursor-pointer">Listing</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Buyer Selection */}
          {assignmentType === "buyer" && (
            <div className="space-y-2">
              <Label htmlFor="buyer-select" className="text-text-heading">
                Select Buyer (Active/Pending Only)
              </Label>
              {activeBuyers.length === 0 ? (
                <p className="text-sm text-text-muted">No active or pending buyers available</p>
              ) : (
                <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                  <SelectTrigger id="buyer-select" className="bg-background-elevated">
                    <SelectValue placeholder="Choose a buyer" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {activeBuyers.map((buyer) => (
                      <SelectItem key={buyer.id} value={buyer.id}>
                        {buyer.firstName} {buyer.lastName} ({buyer.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Listing Selection */}
          {assignmentType === "listing" && (
            <div className="space-y-2">
              <Label htmlFor="listing-select" className="text-text-heading">
                Select Listing (Active/Pending Only)
              </Label>
              {activeListings.length === 0 ? (
                <p className="text-sm text-text-muted">No active or pending listings available</p>
              ) : (
                <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                  <SelectTrigger id="listing-select" className="bg-background-elevated">
                    <SelectValue placeholder="Choose a listing" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {activeListings.map((listing) => (
                      <SelectItem key={listing.id} value={listing.id}>
                        {listing.address} - {listing.city} ({listing.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-text-heading">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add additional details..."
              className="min-h-[100px] bg-background-elevated"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
