import React, { useState, useEffect, useRef } from 'react';
import {
    createTicket,
    getUserTickets,
    addTicketMessage,
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpCircle, MessageSquare, Send, RefreshCw } from "lucide-react";
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
}

const SupportSystem = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({ title: '', description: '' });
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [reply, setReply] = useState('');
    const [submitting, setSubmitting] = useState(false);
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
            const data = await getUserTickets();
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
            // Update ticket in the list too
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

    const handleCreateTicket = async () => {
        if (!newTicket.title || !newTicket.description) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setSubmitting(true);
            await createTicket(newTicket);
            toast.success("Ticket created successfully");
            setIsModalOpen(false);
            setNewTicket({ title: '', description: '' });
            fetchTickets();
        } catch (error: any) {
            toast.error(error.message || "Failed to create ticket");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendReply = async () => {
        if (!reply.trim() || !selectedTicket) return;

        try {
            setSubmitting(true);
            const response = await addTicketMessage(selectedTicket._id, reply);
            if (response.success) {
                setSelectedTicket(response.ticket);
                setReply('');
                // Update ticket in the list too
                setTickets(tickets.map(t => t._id === response.ticket._id ? response.ticket : t));
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to send message");
        } finally {
            setSubmitting(false);
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Support & Help</h1>
                    <p className="text-muted-foreground">Raise tickets and track your help requests.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={fetchTickets}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <HelpCircle className="h-4 w-4" />
                                Need Help?
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Raise a Support Ticket</DialogTitle>
                                <DialogDescription>
                                    Explain your issue or query. Our team will get back to you soon.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Subject / Title</label>
                                    <Input
                                        placeholder="e.g., Payment failed but amount deducted"
                                        value={newTicket.title}
                                        onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Detailed Description</label>
                                    <Textarea
                                        placeholder="Provide as much detail as possible..."
                                        className="min-h-[100px]"
                                        value={newTicket.description}
                                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreateTicket} disabled={submitting}>
                                    {submitting ? "Submitting..." : "Submit Ticket"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Tickets</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[500px]">
                            {tickets.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No tickets found
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {tickets.map((ticket) => (
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
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Updated {new Date(ticket.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-none shadow-sm h-[600px] flex flex-col">
                    {selectedTicket ? (
                        <>
                            <CardHeader className="border-b">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">{selectedTicket.title}</CardTitle>
                                        <CardDescription>Ticket ID: {selectedTicket.ticketId}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={refreshTicket} className="h-8 w-8">
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                        {getStatusBadge(selectedTicket.status)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-4">
                                        {selectedTicket.messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[80%] rounded-2xl p-3 px-4 ${msg.sender === 'user'
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                    : 'bg-muted rounded-tl-none'
                                                    }`}>
                                                    <p className="text-sm">{msg.message}</p>
                                                    <span className="text-[10px] opacity-70 mt-1 block">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
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
                                                placeholder="Type your reply..."
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
                                        This ticket is {selectedTicket.status}. If you still need help, please raise a new ticket.
                                    </div>
                                )}
                            </CardContent>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10 text-center">
                            <div className="bg-muted rounded-full p-6 mb-4">
                                <MessageSquare className="h-10 w-10 opacity-20" />
                            </div>
                            <h3 className="text-lg font-medium">Select a ticket to view conversation</h3>
                            <p className="max-w-[280px]">Or click "Need Help?" to raise a new support request.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default SupportSystem;
