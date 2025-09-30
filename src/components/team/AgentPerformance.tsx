import React from "react";
import { TrendingUp, AlertTriangle, Clock, MoreVertical } from "lucide-react";
import BentoCard from "@/components/dashboard/BentoCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exampleAgentPerformance } from "@/data/teamExampleData";

export default function AgentPerformance() {
  const { topPerformers, atRisk, avgResponseTime, agents } = exampleAgentPerformance;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: 'compact',
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Top Performer":
        return "default";
      case "At Risk":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const atRiskAgents = agents.filter(agent => agent.status === "At Risk");

  return (
    <BentoCard className="col-span-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-heading">Agent Performance</h2>
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <MoreVertical className="h-5 w-5 text-text-muted" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-success/20 bg-success/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-success mb-1">Top Performers</p>
              <p className="text-3xl font-bold text-success">{topPerformers}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success" />
          </div>
        </div>

        <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-warning mb-1">At Risk</p>
              <p className="text-3xl font-bold text-warning">{atRisk}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary mb-1">Avg Response</p>
              <p className="text-3xl font-bold text-primary">{avgResponseTime}</p>
            </div>
            <Clock className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Agent Table */}
      <div className="rounded-lg border border-card-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Agent</TableHead>
              <TableHead className="font-semibold text-center">Active Buyers</TableHead>
              <TableHead className="font-semibold text-center">Listings</TableHead>
              <TableHead className="font-semibold text-center">Response Time</TableHead>
              <TableHead className="font-semibold text-center">Follow-ups</TableHead>
              <TableHead className="font-semibold text-center">Showings</TableHead>
              <TableHead className="font-semibold text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => {
              const followUpPercentage = Math.round((agent.followUps.completed / agent.followUps.total) * 100);
              const isResponseSlow = parseFloat(agent.responseTime) > 5;
              const hasOverdue = agent.followUps.overdue > 0;

              return (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={agent.avatar} alt={agent.name} />
                        <AvatarFallback>
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-text-heading">{agent.name}</p>
                        <p className="text-sm text-text-muted">
                          {agent.deals} deals • {formatCurrency(agent.volume)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {agent.activeBuyers}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {agent.listings}
                  </TableCell>
                  <TableCell className={`text-center font-semibold ${isResponseSlow ? 'text-destructive' : 'text-success'}`}>
                    {agent.responseTime}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-semibold ${hasOverdue ? 'text-destructive' : 'text-success'}`}>
                        {agent.followUps.completed}/{agent.followUps.total}
                      </span>
                      <span className={`text-xs ${hasOverdue ? 'text-destructive' : 'text-success'}`}>
                        {hasOverdue ? `${agent.followUps.overdue} overdue` : `${followUpPercentage}%`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {agent.showings}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusBadgeVariant(agent.status)}>
                      {agent.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* At Risk Alert */}
      {atRiskAgents.length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Agents at Risk - Action Required</strong>
            <div className="mt-1">
              {atRiskAgents.map((agent, index) => (
                <div key={agent.id}>
                  {agent.name}: {agent.followUps.overdue} overdue follow-ups, {agent.responseTime} avg response time
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </BentoCard>
  );
}
