import React, { useState } from 'react';
import { ChevronDown, Plus, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBot } from '@/context/BotContext';
import { toast } from 'sonner';

export default function BotSwitcher() {
  const { bots, currentBot, setCurrentBotId, addBot } = useBot() || {};
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await addBot!(name);
      toast.success('Bot created');
      setNewName('');
      setAddOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create bot');
    } finally {
      setAdding(false);
    }
  };

  if (!bots?.length) return null;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground font-normal">
            <Bot className="h-4 w-4" />
            <span className="max-w-[100px] truncate">{currentBot?.name || 'Bot'}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {bots.map((b) => (
            <DropdownMenuItem
              key={b._id}
              onClick={() => {
                setCurrentBotId(b._id);
                setOpen(false);
              }}
            >
              {b.name} <span className="text-muted-foreground text-xs ml-1">({b.slug})</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAddOpen(true); setOpen(false); }}>
            <Plus className="h-4 w-4 mr-2" /> Add bot
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new bot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bot-name">Name</Label>
              <Input
                id="bot-name"
                placeholder="e.g. Support Bot"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={adding || !newName.trim()}>{adding ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
