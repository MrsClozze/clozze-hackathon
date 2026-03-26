import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, Mail, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function HelpfulLinksWidget() {
  const [isEditing, setIsEditing] = useState(false);
  const [bookingLink, setBookingLink] = useState("");
  const [preferredEmail, setPreferredEmail] = useState("");
  const [tempBookingLink, setTempBookingLink] = useState("");
  const [tempPreferredEmail, setTempPreferredEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('agent_communication_preferences')
      .select('booking_link_url, preferred_email')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setBookingLink(data.booking_link_url || "");
      setPreferredEmail(data.preferred_email || "");
    }
  };

  const handleEdit = () => {
    setTempBookingLink(bookingLink);
    setTempPreferredEmail(preferredEmail);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempBookingLink("");
    setTempPreferredEmail("");
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('agent_communication_preferences')
        .update({
          booking_link_url: tempBookingLink || null,
          preferred_email: tempPreferredEmail || null,
          has_booking_link: !!tempBookingLink,
          has_preferred_email: !!tempPreferredEmail,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setBookingLink(tempBookingLink);
      setPreferredEmail(tempPreferredEmail);
      setIsEditing(false);
      toast({
        title: "Links Updated",
        description: "Your helpful links have been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast({
        title: "Update Failed",
        description: "Could not update your links. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 bg-gradient-subtle border-card-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-heading">Helpful Links</h3>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="booking-link" className="text-sm font-medium text-text-heading mb-2 block">
              Booking Link
            </Label>
            <Input
              id="booking-link"
              value={tempBookingLink}
              onChange={(e) => setTempBookingLink(e.target.value)}
              placeholder="https://calendly.com/your-link"
              type="url"
            />
          </div>
          <div>
            <Label htmlFor="preferred-email" className="text-sm font-medium text-text-heading mb-2 block">
              Preferred Communication Email
            </Label>
            <Input
              id="preferred-email"
              value={tempPreferredEmail}
              onChange={(e) => setTempPreferredEmail(e.target.value)}
              placeholder="your.email@example.com"
              type="email"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              <Check className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleCancel} variant="ghost" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {bookingLink ? (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Link className="h-5 w-5 text-accent-gold mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-heading mb-1">Booking Link</p>
                <a
                  href={bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-gold hover:underline break-all"
                >
                  {bookingLink}
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Link className="h-5 w-5 text-text-muted mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-heading mb-1">Booking Link</p>
                <p className="text-sm text-text-muted">Not set</p>
              </div>
            </div>
          )}

          {preferredEmail ? (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Mail className="h-5 w-5 text-accent-gold mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-heading mb-1">Preferred Email</p>
                <a
                  href={`mailto:${preferredEmail}`}
                  className="text-sm text-accent-gold hover:underline break-all"
                >
                  {preferredEmail}
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Mail className="h-5 w-5 text-text-muted mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-heading mb-1">Preferred Email</p>
                <p className="text-sm text-text-muted">Not set</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
