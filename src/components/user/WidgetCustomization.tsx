import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getWidgetConfig, updateWidgetConfig } from '@/services/api';
import { toast } from 'sonner';

interface WidgetConfig {
  primaryColor?: string;
  accentColor?: string;
  botAvatarUrl?: string;
  position?: 'bottom-left' | 'bottom-right';
  welcomeMessage?: string;
  botName?: string;
  size?: 'compact' | 'standard' | 'large';
  autoOpenDelay?: number;
  customCss?: string;
  showPoweredBy?: boolean;
}

export default function WidgetCustomization() {
  const [config, setConfig] = useState<WidgetConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWidgetConfig()
      .then(setConfig)
      .catch(() => toast.error('Failed to load widget config'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof WidgetConfig, value: string | number | boolean) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateWidgetConfig(config);
      toast.success('Widget settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Widget Customization</CardTitle>
          <CardDescription>Customize how your chat widget looks and behaves on your site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Bot name</Label>
              <Input
                value={config.botName ?? ''}
                onChange={(e) => handleChange('botName', e.target.value)}
                placeholder="e.g. Support Bot"
              />
            </div>
            <div>
              <Label>Primary color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.primaryColor ?? '#2563EB'}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={config.primaryColor ?? '#2563EB'}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div>
              <Label>Accent color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.accentColor ?? '#22D3EE'}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={config.accentColor ?? '#22D3EE'}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div>
              <Label>Position</Label>
              <Select
                value={config.position ?? 'bottom-right'}
                onValueChange={(v) => handleChange('position', v as 'bottom-left' | 'bottom-right')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom right</SelectItem>
                  <SelectItem value="bottom-left">Bottom left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Size</Label>
              <Select
                value={config.size ?? 'standard'}
                onValueChange={(v) => handleChange('size', v as 'compact' | 'standard' | 'large')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auto-open delay (seconds, 0 = off)</Label>
              <Input
                type="number"
                min={0}
                value={config.autoOpenDelay ?? 0}
                onChange={(e) => handleChange('autoOpenDelay', parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
          <div>
            <Label>Welcome message</Label>
            <Input
              value={config.welcomeMessage ?? ''}
              onChange={(e) => handleChange('welcomeMessage', e.target.value)}
              placeholder="e.g. Hi! How can we help?"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Show &quot;Powered by&quot; badge</Label>
              <p className="text-sm text-muted-foreground">Display branding in the widget footer.</p>
            </div>
            <Switch
              checked={config.showPoweredBy !== false}
              onCheckedChange={(v) => handleChange('showPoweredBy', v)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
