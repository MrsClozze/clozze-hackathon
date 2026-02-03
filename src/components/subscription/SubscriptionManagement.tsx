import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Calendar, 
  Download, 
  ExternalLink, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMemberSlots } from "@/hooks/useTeamMemberSlots";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SubscriptionDetails {
  id: string;
  status: string;
  planName: string;
  productId: string;
  priceId: string;
  amount: number;
  currency: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  createdAt: string;
  trialEnd: string | null;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  description: string;
}

export default function SubscriptionManagement() {
  const { refreshSubscription } = useAuth();
  const { totalSlots, usedSlots, hasTeamMemberAccess, refetch: refetchSlots } = useTeamMemberSlots();
  const { toast } = useToast();
  
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [reenablingSubscription, setReenablingSubscription] = useState(false);

  useEffect(() => {
    fetchSubscriptionDetails();
    fetchBillingHistory();
  }, []);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timer: number | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  };

  const fetchSubscriptionDetails = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('get-subscription-details'),
        15000,
        'Loading subscription'
      );
      if (error) throw error;
      setSubscriptionDetails(data.subscription);
    } catch (error: any) {
      console.error('Error fetching subscription details:', error);
      toast({
        title: "Error loading subscription",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('get-billing-history'),
        15000,
        'Loading billing history'
      );
      if (error) throw error;
      setInvoices(data.invoices || []);
    } catch (error: any) {
      console.error('Error fetching billing history:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error opening billing portal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancellingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { immediate: false }
      });
      if (error) throw error;
      
      toast({
        title: "Subscription cancelled",
        description: "Your subscription will remain active until the end of your billing period.",
      });
      
      // Refresh data
      await fetchSubscriptionDetails();
      await refreshSubscription();
    } catch (error: any) {
      toast({
        title: "Error cancelling subscription",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleReenableSubscription = async () => {
    setReenablingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('reenable-subscription');
      if (error) throw error;
      
      toast({
        title: "Subscription re-enabled",
        description: "Your subscription will continue as normal.",
      });
      
      // Refresh data
      await fetchSubscriptionDetails();
      await refreshSubscription();
    } catch (error: any) {
      toast({
        title: "Error re-enabling subscription",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReenablingSubscription(false);
    }
  };

  // Group invoices by year and month
  const groupedInvoices = invoices.reduce((acc, invoice) => {
    if (!invoice.date) return acc;
    const date = new Date(invoice.date);
    const yearMonth = format(date, 'MMMM yyyy');
    if (!acc[yearMonth]) {
      acc[yearMonth] = [];
    }
    acc[yearMonth].push(invoice);
    return acc;
  }, {} as Record<string, Invoice[]>);

  if (loadingDetails) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Current Subscription</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </div>
            {subscriptionDetails && (
              <Badge 
                variant={subscriptionDetails.cancelAtPeriodEnd ? "destructive" : subscriptionDetails.status === "trialing" ? "secondary" : "default"}
                className="text-sm"
              >
                {subscriptionDetails.cancelAtPeriodEnd ? "Cancelling" : subscriptionDetails.status === "trialing" ? "Free Trial" : "Active"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscriptionDetails ? (
            <>
              {/* Trial Info Banner */}
              {subscriptionDetails.status === "trialing" && subscriptionDetails.trialEnd && (
                <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium">You're on a free trial</p>
                    <p className="text-sm text-muted-foreground">
                      Your trial ends on <strong>{format(new Date(subscriptionDetails.trialEnd), 'MMMM d, yyyy')}</strong>. 
                      You will be charged <strong>${subscriptionDetails.amount.toFixed(2)}/{subscriptionDetails.interval}</strong> on this date.
                    </p>
                  </div>
                </div>
              )}

              {/* Plan Details */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-lg font-semibold">{subscriptionDetails.planName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {subscriptionDetails.status === "trialing" ? "Price After Trial" : "Amount"}
                  </p>
                  <p className="text-lg font-semibold">
                    ${subscriptionDetails.amount.toFixed(2)} / {subscriptionDetails.interval}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {subscriptionDetails.status === "trialing" ? "Trial Ends" : "Current Period"}
                  </p>
                  <p className="text-lg font-semibold">
                    {subscriptionDetails.status === "trialing" && subscriptionDetails.trialEnd ? (
                      format(new Date(subscriptionDetails.trialEnd), 'MMM d, yyyy')
                    ) : (
                      <>
                        {subscriptionDetails.currentPeriodStart && 
                          format(new Date(subscriptionDetails.currentPeriodStart), 'MMM d')} - {' '}
                        {subscriptionDetails.currentPeriodEnd && 
                          format(new Date(subscriptionDetails.currentPeriodEnd), 'MMM d, yyyy')}
                      </>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {subscriptionDetails.status === "trialing" ? "First Charge Date" : "Next Billing Date"}
                  </p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {subscriptionDetails.cancelAtPeriodEnd ? (
                      <span className="text-destructive">Cancelled</span>
                    ) : subscriptionDetails.status === "trialing" && subscriptionDetails.trialEnd ? (
                      format(new Date(subscriptionDetails.trialEnd), 'MMM d, yyyy')
                    ) : subscriptionDetails.currentPeriodEnd ? (
                      format(new Date(subscriptionDetails.currentPeriodEnd), 'MMM d, yyyy')
                    ) : (
                      'N/A'
                    )}
                  </p>
                </div>
              </div>

              {subscriptionDetails.cancelAtPeriodEnd && (
                <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <p className="text-sm">
                      Your subscription will end on{' '}
                      <strong>
                        {(() => {
                          // For trialing subscriptions, use trialEnd; otherwise use currentPeriodEnd
                          const endDate = subscriptionDetails.status === "trialing" && subscriptionDetails.trialEnd
                            ? subscriptionDetails.trialEnd
                            : subscriptionDetails.currentPeriodEnd;
                          return endDate ? format(new Date(endDate), 'MMMM d, yyyy') : 'the end of your billing period';
                        })()}
                      </strong>
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleReenableSubscription}
                    disabled={reenablingSubscription}
                  >
                    {reenablingSubscription ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Re-enable Subscription
                  </Button>
                </div>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleManageBilling} disabled={openingPortal} variant="outline">
                  {openingPortal ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Update Payment Method
                </Button>
                
                {!subscriptionDetails.cancelAtPeriodEnd && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your subscription will remain active until the end of your current billing period 
                          ({subscriptionDetails.currentPeriodEnd && 
                            format(new Date(subscriptionDetails.currentPeriodEnd), 'MMMM d, yyyy')}). 
                          After that, you'll lose access to premium features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleCancelSubscription}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={cancellingSubscription}
                        >
                          {cancellingSubscription ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Yes, Cancel Subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No active subscription found.</p>
          )}
        </CardContent>
      </Card>

      {/* Team Members Card (only for Team plan) */}
      {hasTeamMemberAccess && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>Manage your team member seats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Seats Used</p>
                <p className="text-2xl font-bold">{usedSlots} / {totalSlots}</p>
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/team'}>
                Manage Team
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>View and download your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No billing history available.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedInvoices).map(([monthYear, monthInvoices]) => (
                <div key={monthYear}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">{monthYear}</h4>
                  <div className="space-y-2">
                    {monthInvoices.map((invoice) => (
                      <div 
                        key={invoice.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${
                            invoice.status === 'paid' ? 'bg-primary/10' : 'bg-secondary/50'
                          }`}>
                            {invoice.status === 'paid' ? (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{invoice.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.number} • {invoice.date && format(new Date(invoice.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">
                            ${invoice.amount.toFixed(2)} {invoice.currency}
                          </span>
                          <div className="flex gap-2">
                            {invoice.invoicePdf && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => window.open(invoice.invoicePdf!, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {invoice.hostedInvoiceUrl && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => window.open(invoice.hostedInvoiceUrl!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
