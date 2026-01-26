import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import BentoCard from "@/components/dashboard/BentoCard";
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  CheckCircle, 
  Clock, 
  User,
  ListTodo
} from "lucide-react";
import { format } from "date-fns";

interface MemberProfile {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  address: string | null;
}

export default function TeamMemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberData();
  }, [memberId, user]);

  const fetchMemberData = async () => {
    if (!memberId || !user) return;

    try {
      // Get team member
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', memberData.user_id)
        .single();

      setMember({
        ...memberData,
        first_name: profileData?.first_name || null,
        last_name: profileData?.last_name || null,
        email: profileData?.email || '',
      });

      // Get tasks assigned to this member
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, address')
        .eq('user_id', memberData.user_id)
        .order('due_date', { ascending: true });

      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'low': return 'text-success bg-success/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'completed' ? (
      <CheckCircle className="h-4 w-4 text-success" />
    ) : (
      <Clock className="h-4 w-4 text-warning" />
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!member) {
    return (
      <Layout>
        <div className="p-8">
          <Button variant="ghost" onClick={() => navigate('/team')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center py-12">
            <p className="text-text-muted">Team member not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <Layout>
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate('/team')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="col-span-1">
            <BentoCard title="Team Member Profile" subtitle="">
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-text-heading mb-1">
                  {member.first_name || 'Pending'} {member.last_name || 'Invite'}
                </h2>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {member.status === 'active' ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-sm">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-sm">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-sm capitalize">
                    {member.role}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-text-heading">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date Added</p>
                    <p className="text-text-heading">
                      {format(new Date(member.joined_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ListTodo className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Tasks</p>
                    <p className="text-text-heading font-semibold">
                      {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>

          {/* Tasks Section */}
          <div className="col-span-2 space-y-6">
            <BentoCard 
              title="Active Tasks" 
              subtitle={`${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''} in progress`}
            >
              {activeTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active tasks assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-card-border"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(task.status)}
                        <div>
                          <p className="font-medium text-text-heading">{task.title}</p>
                          {task.address && (
                            <p className="text-sm text-muted-foreground">{task.address}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className="text-sm text-muted-foreground">
                            Due {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </BentoCard>

            <BentoCard 
              title="Completed Tasks" 
              subtitle={`${completedTasks.length} task${completedTasks.length !== 1 ? 's' : ''} completed`}
            >
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No completed tasks yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-card-border opacity-75"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <div>
                          <p className="font-medium text-text-heading line-through">{task.title}</p>
                          {task.address && (
                            <p className="text-sm text-muted-foreground">{task.address}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {completedTasks.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{completedTasks.length - 5} more completed tasks
                    </p>
                  )}
                </div>
              )}
            </BentoCard>
          </div>
        </div>
      </div>
    </Layout>
  );
}
