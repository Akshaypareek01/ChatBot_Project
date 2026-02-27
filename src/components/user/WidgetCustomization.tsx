import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getWidgetConfig, updateWidgetConfig, uploadWidgetAvatar, generateSuggestedQuestions } from '@/services/api';
import { useBot } from '@/context/BotContext';
import { toast } from 'sonner';

interface PreChatField {
  key: 'name' | 'email' | 'phone';
  label?: string;
  required?: boolean;
}

interface PreChatForm {
  enabled?: boolean;
  welcomeMessage?: string;
  fields?: PreChatField[];
}

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
  preChatForm?: PreChatForm;
  suggestedQuestions?: string[];
  leadCaptureWebhookUrl?: string;
}

export default function WidgetCustomization() {
  const { currentBotId } = useBot() || {};
  const [config, setConfig] = useState<WidgetConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getWidgetConfig(currentBotId ?? undefined)
      .then(setConfig)
      .catch(() => toast.error('Failed to load widget config'))
      .finally(() => setLoading(false));
  }, [currentBotId]);

  const handleChange = (key: keyof WidgetConfig, value: string | number | boolean) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateWidgetConfig(config, currentBotId ?? undefined);
      toast.success('Widget settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setAvatarUploading(true);
    try {
      const { botAvatarUrl } = await uploadWidgetAvatar(file);
      setConfig((c) => ({ ...c, botAvatarUrl }));
      toast.success('Avatar updated');
    } catch {
      toast.error('Avatar upload failed');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
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
              <Label>Bot avatar</Label>
              <div className="flex items-center gap-4">
                {config.botAvatarUrl ? (
                  <img src={config.botAvatarUrl} alt="Bot" className="h-14 w-14 rounded-full object-cover border" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No image</div>
                )}
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}>
                    {avatarUploading ? 'Uploading...' : 'Upload image'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG or WebP, max 2MB. Or paste URL below.</p>
                </div>
              </div>
              <Input
                className="mt-2"
                value={config.botAvatarUrl ?? ''}
                onChange={(e) => handleChange('botAvatarUrl', e.target.value)}
                placeholder="Or paste image URL"
              />
            </div>
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
          <div>
            <Label>Suggested questions (quick replies)</Label>
            <div className="flex gap-2">
              <Textarea
                value={(config.suggestedQuestions ?? []).join('\n')}
                onChange={(e) =>
                  handleChange(
                    'suggestedQuestions',
                    e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="One per line, e.g.&#10;What are your opening hours?&#10;How do I contact support?"
                rows={3}
                className="text-sm flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={async () => {
                  try {
                    const { suggestedQuestions: generated } = await generateSuggestedQuestions();
                    setConfig((c) => ({ ...c, suggestedQuestions: generated || [] }));
                    toast.success('Generated from knowledge base');
                  } catch {
                    toast.error('Generate failed');
                  }
                }}
              >
                Generate from KB
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Up to 5 shown as buttons when the chat opens and after each reply.</p>
          </div>
          <div>
            <Label>Custom CSS</Label>
            <Textarea
              value={config.customCss ?? ''}
              onChange={(e) => handleChange('customCss', e.target.value)}
              placeholder="#chatbot-widget-container { ... }"
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Optional. Use selector #chatbot-widget-container to style the widget.</p>
          </div>
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Pre-chat form (lead capture)</Label>
                <p className="text-sm text-muted-foreground">Show a form before chat to collect name, email, phone.</p>
              </div>
              <Switch
                checked={config.preChatForm?.enabled === true}
                onCheckedChange={(v) => {
                  setConfig((c) => ({
                    ...c,
                    preChatForm: {
                      ...c.preChatForm,
                      enabled: v,
                      welcomeMessage: c.preChatForm?.welcomeMessage ?? 'Please share your details to start.',
                      fields: c.preChatForm?.fields?.length
                        ? c.preChatForm.fields
                        : [
                            { key: 'name', label: 'Name', required: false },
                            { key: 'email', label: 'Email', required: true },
                            { key: 'phone', label: 'Phone', required: false },
                          ],
                    },
                  }));
                }}
              />
            </div>
            {config.preChatForm?.enabled && (
              <div className="space-y-2 pl-2 border-l-2">
                <Label>Webhook URL (on new lead)</Label>
                <Input
                  value={config.leadCaptureWebhookUrl ?? ''}
                  onChange={(e) => handleChange('leadCaptureWebhookUrl', e.target.value)}
                  placeholder="https://your-server.com/webhook"
                />
                <Label>Form welcome message</Label>
                <Input
                  value={config.preChatForm?.welcomeMessage ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      preChatForm: { ...c.preChatForm!, welcomeMessage: e.target.value },
                    }))
                  }
                  placeholder="e.g. Please share your details to start."
                />
                <div className="flex flex-wrap gap-4 pt-2">
                  {(['name', 'email', 'phone'] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          config.preChatForm?.fields?.some((f) => f.key === key && f.required) ?? false
                        }
                        onChange={(e) => {
                          const fields = config.preChatForm?.fields ?? [
                            { key: 'name', label: 'Name', required: false },
                            { key: 'email', label: 'Email', required: true },
                            { key: 'phone', label: 'Phone', required: false },
                          ];
                          const next = fields.map((f) =>
                            f.key === key ? { ...f, required: e.target.checked } : f
                          );
                          setConfig((c) => ({
                            ...c,
                            preChatForm: { ...c.preChatForm!, fields: next },
                          }));
                        }}
                      />
                      <span className="text-sm capitalize">{key} required</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
