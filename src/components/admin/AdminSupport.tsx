import React, { useState, useEffect, useRef } from 'react';
import {
    getAdminTickets,
    addTicketMessage,
    updateTicketStatus,
    getTicketDetails
} from '@/services/api';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, RefreshCw, User, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Message {
    sender: 'user' | 'admin';
    message: string;
    timestamp: string;
}

interface Ticket {
    _id: string;
    ticketId: string;
    title: string;
    description: string;
    status: 'open' | 'in-progress' | 'resolved' | 'closed';
    messages: Message[];
    createdAt: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
}

const AdminSupport = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [reply, setReply] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (selectedTicket) {
            scrollToBottom();
        }
    }, [selectedTicket?.messages]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const data = await getAdminTickets();
            setTickets(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch tickets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const refreshTicket = async () => {
        if (!selectedTicket) return;
        try {
            const data = await getTicketDetails(selectedTicket._id);
            setSelectedTicket(data);
            // Update ticket in the list
            setTickets(prev => prev.map(t => t._id === data._id ? data : t));
        } catch (error) {
            console.error("Refresh failed", error);
        }
    };

    useEffect(() => {
        let interval: any;
        if (selectedTicket && selectedTicket.status !== 'closed') {
            interval = setInterval(refreshTicket, 30000); // Poll every 30s
        }
        return () => clearInterval(interval);
    }, [selectedTicket]);

    const handleSendReply = async () => {
        if (!reply.trim() || !selectedTicket) return;

        try {
            setSubmitting(true);
            const response = await addTicketMessage(selectedTicket._id, reply);
            if (response.success) {
                setSelectedTicket({ ...selectedTicket, messages: response.ticket.messages, status: response.ticket.status });
                setReply('');
                // Update ticket in the list
                setTickets(tickets.map(t => t._id === response.ticket._id ? { ...t, messages: response.ticket.messages, status: response.ticket.status } : t));
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to send message");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!selectedTicket) return;

        try {
            const response = await updateTicketStatus(selectedTicket._id, newStatus);
            if (response.success) {
                setSelectedTicket({ ...selectedTicket, status: response.ticket.status });
                setTickets(tickets.map(t => t._id === response.ticket._id ? { ...t, status: response.ticket.status } : t));
                toast.success(`Status updated to ${newStatus}`);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to update status");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
            case 'in-progress': return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
            case 'resolved': return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
            case 'closed': return <Badge variant="destructive" className="bg-gray-50 text-gray-700 border-gray-200">Closed</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const filteredTickets = filterStatus === 'all'
        ? tickets
        : tickets.filter(t => t.status === filterStatus);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Support Management</h1>
                    <p className="text-muted-foreground">Manage user queries and support tickets.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchTickets}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-none shadow-sm h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">User Tickets</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[600px]">
                            {filteredTickets.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No tickets found
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredTickets.map((ticket) => (
                                        <div
                                            key={ticket._id}
                                            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedTicket?._id === ticket._id ? 'bg-muted shadow-inner' : ''}`}
                                            onClick={() => setSelectedTicket(ticket)}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-medium text-muted-foreground">{ticket.ticketId}</span>
                                                {getStatusBadge(ticket.status)}
                                            </div>
                                            <h3 className="font-semibold text-sm truncate">{ticket.title}</h3>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                                                <User className="h-3 w-3" />
                                                <span className="truncate">{ticket.userId?.name || 'Unknown'}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Raised {new Date(ticket.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-none shadow-sm h-[700px] flex flex-col">
                    {selectedTicket ? (
                        <>
                            <CardHeader className="border-b">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{selectedTicket.title}</CardTitle>
                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium text-foreground">ID: {selectedTicket.ticketId}</span>
                                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {selectedTicket.userId?.name}</span>
                                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedTicket.userId?.email}</span>
                                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={refreshTicket} className="h-8 w-8">
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                            {getStatusBadge(selectedTicket.status)}
                                        </div>
                                        <Select value={selectedTicket.status} onValueChange={handleStatusChange}>
                                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                                <SelectValue placeholder="Update Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="in-progress">In Progress</SelectItem>
                                                <SelectItem value="resolved">Resolved</SelectItem>
                                                <SelectItem value="closed">Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-4">
                                        {selectedTicket.messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className="flex flex-col max-w-[80%]">
                                                    <span className={`text-[10px] mb-1 ${msg.sender === 'admin' ? 'text-right' : 'text-left'}`}>
                                                        {msg.sender === 'admin' ? 'Support Admin' : selectedTicket.userId?.name}
                                                    </span>
                                                    <div className={`rounded-2xl p-3 px-4 ${msg.sender === 'admin'
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                        : 'bg-muted rounded-tl-none'
                                                        }`}>
                                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                        <span className="text-[10px] opacity-70 mt-1 block">
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                                {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' ? (
                                    <div className="p-4 border-t bg-muted/30">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Type your reply to user..."
                                                value={reply}
                                                onChange={(e) => setReply(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                            />
                                            <Button onClick={handleSendReply} disabled={submitting || !reply.trim()} size="icon">
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 border-t bg-muted text-center text-sm text-muted-foreground italic">
                                        This ticket is {selectedTicket.status}. Re-open it to send more messages.
                                    </div>
                                )}
                            </CardContent>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10 text-center">
                            <div className="bg-muted rounded-full p-6 mb-4">
                                <MessageSquare className="h-10 w-10 opacity-20" />
                            </div>
                            <h3 className="text-lg font-medium">Select a ticket to manage</h3>
                            <p className="max-w-[280px]">Tickets requiring attention will appear in the list on the left.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AdminSupport;
