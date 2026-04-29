import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, TextArea, TextInput, SmallButton, Divider, Select } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { CardButton, CardsNode, FlowCard } from '../types';
import type { NodeFormProps } from './types';

const newButton = (): CardButton => ({
    id: `btn-${Math.random().toString(36).slice(2, 9)}`,
    label: 'View',
    kind: 'postback',
    nextNodeId: '',
    url: '',
});

const newCard = (): FlowCard => ({
    id: `card-${Math.random().toString(36).slice(2, 9)}`,
    title: 'New card',
    subtitle: '',
    imageUrl: '',
    buttons: [],
});

/**
 * Cards node \u2014 renders one or more card "tiles" (image + title + subtitle +
 * action buttons). Buttons can be `postback` (re-enter the flow at a node),
 * `url` (open a URL), or `call_api` (TODO Phase 5: trigger an API node by id).
 */
export default function CardsForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<CardsNode>) {
    const cards = node.cards || [];

    const updateCard = (id: string, patch: Partial<FlowCard>) =>
        onChange({
            cards: cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        } as any);

    const removeCard = (id: string) =>
        onChange({ cards: cards.filter((c) => c.id !== id) } as any);

    const addCard = () =>
        onChange({ cards: [...cards, newCard()] } as any);

    return (
        <div className="space-y-4">
            <Field
                label="Pre-cards message (optional)"
                hint="Shown above the cards \u2014 useful for context."
            >
                <TextArea
                    rows={2}
                    value={node.text || ''}
                    onChange={(e) => onChange({ text: e.target.value } as any)}
                    placeholder="e.g. Here are a few options I think you\u2019ll like:"
                />
            </Field>

            <div className="space-y-3">
                {cards.map((card, i) => (
                    <div
                        key={card.id}
                        className="rounded-lg border border-slate-900/[0.06] bg-slate-50/50 p-3 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Card {i + 1}
                            </span>
                            <SmallButton
                                tone="danger"
                                onClick={() => removeCard(card.id)}
                            >
                                <Trash2 className="w-3 h-3" /> Remove
                            </SmallButton>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Title">
                                <TextInput
                                    value={card.title || ''}
                                    onChange={(e) =>
                                        updateCard(card.id, {
                                            title: e.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field label="Subtitle">
                                <TextInput
                                    value={card.subtitle || ''}
                                    onChange={(e) =>
                                        updateCard(card.id, {
                                            subtitle: e.target.value,
                                        })
                                    }
                                />
                            </Field>
                        </div>

                        <Field label="Image URL">
                            <TextInput
                                value={card.imageUrl || ''}
                                onChange={(e) =>
                                    updateCard(card.id, {
                                        imageUrl: e.target.value,
                                    })
                                }
                                placeholder="https:\u2026"
                            />
                        </Field>

                        <CardButtonsEditor
                            buttons={card.buttons || []}
                            nodes={ctx.nodes}
                            currentNodeId={node.id}
                            onChange={(b) =>
                                updateCard(card.id, { buttons: b })
                            }
                        />
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addCard}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-slate-900/20 text-[12px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/40 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> Add card
                </button>
            </div>

            <Divider>Routing</Divider>
            <Field
                label="After this step \u2014 next node"
                hint="If unset, the flow pauses for visitor input or button click."
            >
                <NodeRefPicker
                    value={node.fallbackNextNodeId}
                    onChange={(id) =>
                        onChange({ fallbackNextNodeId: id } as any)
                    }
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>
        </div>
    );
}

const CardButtonsEditor: React.FC<{
    buttons: CardButton[];
    onChange: (next: CardButton[]) => void;
    nodes: CardsNode extends infer T ? any : any;
    currentNodeId: string;
}> = ({ buttons, onChange, nodes, currentNodeId }) => {
    const update = (id: string, patch: Partial<CardButton>) =>
        onChange(
            buttons.map((b) => (b.id === id ? { ...b, ...patch } : b))
        );

    const remove = (id: string) =>
        onChange(buttons.filter((b) => b.id !== id));

    return (
        <div className="space-y-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Buttons
            </span>
            {buttons.map((b) => (
                <div
                    key={b.id}
                    className="rounded-md border border-slate-900/[0.06] bg-white p-2.5 space-y-2"
                >
                    <div className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
                        <TextInput
                            value={b.label}
                            onChange={(e) =>
                                update(b.id, { label: e.target.value })
                            }
                            placeholder="Button label"
                        />
                        <Select
                            value={b.kind}
                            onChange={(e) =>
                                update(b.id, { kind: e.target.value as any })
                            }
                        >
                            <option value="postback">Go to node</option>
                            <option value="url">Open URL</option>
                            <option value="call_api">Call API</option>
                        </Select>
                        <SmallButton
                            tone="danger"
                            onClick={() => remove(b.id)}
                        >
                            <Trash2 className="w-3 h-3" />
                        </SmallButton>
                    </div>
                    {b.kind === 'url' ? (
                        <TextInput
                            value={b.url || ''}
                            onChange={(e) =>
                                update(b.id, { url: e.target.value })
                            }
                            placeholder="https://\u2026"
                        />
                    ) : (
                        <NodeRefPicker
                            value={b.nextNodeId || ''}
                            onChange={(id) =>
                                update(b.id, { nextNodeId: id })
                            }
                            nodes={nodes}
                            excludeId={currentNodeId}
                        />
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={() => onChange([...buttons, newButton()])}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-dashed border-slate-900/20 text-[11.5px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/40 transition-colors"
            >
                <Plus className="w-3 h-3" /> Add button
            </button>
        </div>
    );
};
