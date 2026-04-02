/**
 * Phase 5.5: Reseller dashboard — list clients (users assigned to this reseller).
 * Shown only when user.role === 'reseller'.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getResellerClients } from '@/services/api';
import { toast } from 'sonner';
import { Users, Loader2, Mail, Zap } from 'lucide-react';

interface Client {
  _id: string;
  name: string;
  email: string;
  tokenBalance: number;
  createdAt: string;
  isActive?: boolean;
  planName?: string;
  chatCountThisMonth?: number;
  chatLimit?: number | null;
}

const ResellerClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResellerClients()
      .then((data) => setClients(data?.clients ?? []))
      .catch(() => {
        toast.error('Failed to load clients');
        setClients([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Clients</h1>
        <p className="text-muted-foreground">Users assigned to your reseller account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client list
          </CardTitle>
          <CardDescription>Manage and view your client chatbots.</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No clients yet</p>
              <p className="text-sm">Admins can assign users to your reseller account from the admin panel.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div
                  key={c._id}
                  className="border rounded-lg p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-amber-500" />
                      {c.tokenBalance?.toLocaleString() ?? 0} tokens
                    </span>
                    <span>{c.planName ?? 'Free'}</span>
                    {c.chatLimit != null && (
                      <span className="text-muted-foreground">
                        {c.chatCountThisMonth ?? 0} / {c.chatLimit} chats
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerClients;
