import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, X, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useTasks } from "@/contexts/TasksContext";
import TaskDetailsModal from "./TaskDetailsModal";

interface BuyerData {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  description: string;
  status: string;
  image: string;
  preApprovedAmount: number;
  wantsNeeds: string;
  brokerageName: string;
  brokerageAddress: string;
  agentName: string;
  agentEmail: string;
  commissionPercentage: number;
  totalCommission: number;
  agentCommission: number;
  brokerageCommission: number;
}

interface BuyerDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer: BuyerData | null;
}

export default function BuyerDetailsModal({ open, onOpenChange, buyer }: BuyerDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBuyer, setEditedBuyer] = useState<BuyerData | null>(null);
  const { tasks, openTaskModal } = useTasks();

  if (!buyer) return null;

  const currentBuyer = isEditing && editedBuyer ? editedBuyer : buyer;
  const associatedTasks = tasks.filter((task) => task.buyerId === buyer.id);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedBuyer({ ...buyer });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    // Save logic would go here
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedBuyer(null);
    setIsEditing(false);
  };

  const updateField = (field: keyof BuyerData, value: any) => {
    if (editedBuyer) {
      setEditedBuyer({ ...editedBuyer, [field]: value });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-center justify-between">
            <DialogTitle>Buyer Details</DialogTitle>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                className="flex-shrink-0"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Buyer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <img
                src={currentBuyer.image}
                alt={currentBuyer.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h3 className="text-xl font-semibold text-text-heading">{currentBuyer.name}</h3>
                <Badge className="mt-1 bg-accent-gold text-accent-gold-foreground">
                  {currentBuyer.status}
                </Badge>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-text-heading">Buyer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">First Name</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.firstName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Last Name</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.lastName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Email Address</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={currentBuyer.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.email}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Cell Phone</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.phone}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Pre-approved Loan Amount</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentBuyer.preApprovedAmount}
                    onChange={(e) => updateField('preApprovedAmount', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1 font-semibold">
                    ${currentBuyer.preApprovedAmount.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Primary Wants/Needs</Label>
                {isEditing ? (
                  <Textarea
                    value={currentBuyer.wantsNeeds}
                    onChange={(e) => updateField('wantsNeeds', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                ) : (
                  <p className="text-base mt-1 p-3 bg-muted/30 rounded-md border">
                    {currentBuyer.wantsNeeds}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Brokerage Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Brokerage Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Name</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.brokerageName}
                    onChange={(e) => updateField('brokerageName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.brokerageName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Brokerage Address</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.brokerageAddress}
                    onChange={(e) => updateField('brokerageAddress', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.brokerageAddress}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Name</Label>
                {isEditing ? (
                  <Input
                    value={currentBuyer.agentName}
                    onChange={(e) => updateField('agentName', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.agentName}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-text-muted">Agent Email</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={currentBuyer.agentEmail}
                    onChange={(e) => updateField('agentEmail', e.target.value)}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.agentEmail}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-text-muted">Commission Percentage</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={currentBuyer.commissionPercentage}
                    onChange={(e) => updateField('commissionPercentage', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-base mt-1">{currentBuyer.commissionPercentage}%</p>
                )}
              </div>
            </div>
            <div className="text-sm p-4 bg-card-elevated rounded-lg border">
              <p className="font-semibold mb-2">Anticipated Commission Breakdown</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Commission Earned:</span>
                  <span className="font-semibold">${currentBuyer.totalCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent Commission (50%):</span>
                  <span className="font-semibold">${currentBuyer.agentCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brokerage Commission (50%):</span>
                  <span className="font-semibold">${currentBuyer.brokerageCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Associated Tasks */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-heading">Associated Tasks</h3>
            {associatedTasks.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <p className="text-sm">No tasks associated with this buyer</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* All Tasks Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide">All Tasks ({associatedTasks.length})</h4>
                  {associatedTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => openTaskModal(task)}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-md border hover:border-accent-gold/50 hover:bg-muted/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          className={`h-5 w-5 ${
                            task.status === "completed"
                              ? "text-success"
                              : task.status === "in-progress"
                              ? "text-warning"
                              : "text-muted-foreground"
                          }`}
                        />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">Due: {task.dueDate}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          task.status === "completed"
                            ? "default"
                            : task.status === "in-progress"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Completed Tasks Section */}
                {associatedTasks.filter(t => t.status === "completed").length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-success uppercase tracking-wide">Completed Tasks ({associatedTasks.filter(t => t.status === "completed").length})</h4>
                    {associatedTasks.filter(task => task.status === "completed").map((task) => (
                      <div
                        key={task.id}
                        onClick={() => openTaskModal(task)}
                        className="flex items-center justify-between p-3 bg-success/5 rounded-md border border-success/20 hover:border-success/40 hover:bg-success/10 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">Due: {task.dueDate}</p>
                          </div>
                        </div>
                        <Badge variant="default">{task.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Tasks Section */}
                {associatedTasks.filter(t => t.status === "pending" || t.status === "in-progress").length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-warning uppercase tracking-wide">Pending Tasks ({associatedTasks.filter(t => t.status === "pending" || t.status === "in-progress").length})</h4>
                    {associatedTasks.filter(task => task.status === "pending" || task.status === "in-progress").map((task) => (
                      <div
                        key={task.id}
                        onClick={() => openTaskModal(task)}
                        className="flex items-center justify-between p-3 bg-warning/5 rounded-md border border-warning/20 hover:border-warning/40 hover:bg-warning/10 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2
                            className={`h-5 w-5 ${
                              task.status === "in-progress" ? "text-warning" : "text-muted-foreground"
                            }`}
                          />
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">Due: {task.dueDate}</p>
                          </div>
                        </div>
                        <Badge variant={task.status === "in-progress" ? "secondary" : "outline"}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      <TaskDetailsModal />
    </Dialog>
  );
}
