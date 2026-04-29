import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, TextInput, Select, SmallButton, Divider } from './primitives';
import VariablePicker from './pickers/VariablePicker';
import SecretPicker from './pickers/SecretPicker';
import NodeRefPicker from './pickers/NodeRefPicker';
import JsonEditor from './pickers/JsonEditor';
import type { ApiActionNode, ApiHeader, ApiResponseMapEntry } from '../types';
import type { NodeFormProps } from './types';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const AUTH_TYPES = [
    { value: 'none', label: 'No auth' },
    { value: 'bearer', label: 'Bearer token' },
    { value: 'apiKey', label: 'API key (custom header)' },
    { value: 'basic', label: 'Basic (base64)' },
] as const;

/**
 * API Action node \u2014 calls an external HTTP endpoint with optional secret-
 * backed auth, then maps response paths into flow variables. The runtime
 * enforces SSRF protection so localhost / RFC1918 hosts are blocked.
 */
export default function ApiActionForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<ApiActionNode>) {
    const a = node.apiAction!;
    const patch = (updates: Partial<typeof a>) =>
        onChange({ apiAction: { ...a, ...updates } } as any);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-[120px_1fr] gap-2">
                <Field label="Method">
                    <Select
                        value={a.method}
                        onChange={(e) =>
                            patch({ method: e.target.value as any })
                        }
                    >
                        {METHODS.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="URL">
                    <TextInput
                        value={a.url}
                        onChange={(e) => patch({ url: e.target.value })}
                        placeholder="https://api.example.com/orders/{{vars.order_id}}"
                    />
                </Field>
            </div>

            <Divider>Authentication</Divider>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Auth type">
                    <Select
                        value={a.authType}
                        onChange={(e) =>
                            patch({ authType: e.target.value as any })
                        }
                    >
                        {AUTH_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </Select>
                </Field>
                {a.authType === 'apiKey' && (
                    <Field label="Header name">
                        <TextInput
                            value={a.authHeaderName || 'Authorization'}
                            onChange={(e) =>
                                patch({ authHeaderName: e.target.value })
                            }
                            placeholder="X-API-Key"
                        />
                    </Field>
                )}
            </div>

            {a.authType !== 'none' && (
                <Field
                    label="Secret"
                    hint="Pick from your vault. The runtime decrypts it server-side at call time \u2014 the value never reaches the browser."
                >
                    <SecretPicker
                        value={a.authSecretRef}
                        onChange={(name) => patch({ authSecretRef: name })}
                    />
                </Field>
            )}

            <Divider>Headers</Divider>
            <HeadersEditor
                value={a.headers || []}
                onChange={(h) => patch({ headers: h })}
                variables={ctx.variables}
            />

            {(a.method === 'POST' ||
                a.method === 'PUT' ||
                a.method === 'PATCH') && (
                <>
                    <Divider>Body</Divider>
                    <Field
                        label="JSON body"
                        hint="Sent as application/json. Variables are interpolated before parsing."
                    >
                        <JsonEditor
                            value={a.body || ''}
                            onChange={(v) => patch({ body: v })}
                        />
                    </Field>
                </>
            )}

            <Divider>Response mapping</Divider>
            <ResponseMapEditor
                value={a.responseMap || []}
                onChange={(rm) => patch({ responseMap: rm })}
            />

            <Divider>Routing</Divider>
            <div className="grid grid-cols-2 gap-3">
                <Field label="On success \u2014 next">
                    <NodeRefPicker
                        value={a.onSuccessNodeId}
                        onChange={(id) => patch({ onSuccessNodeId: id })}
                        nodes={ctx.nodes}
                        excludeId={node.id}
                    />
                </Field>
                <Field label="On error \u2014 next">
                    <NodeRefPicker
                        value={a.onErrorNodeId}
                        onChange={(id) => patch({ onErrorNodeId: id })}
                        nodes={ctx.nodes}
                        excludeId={node.id}
                    />
                </Field>
            </div>

            <Field label="Timeout (ms)">
                <TextInput
                    type="number"
                    value={a.timeoutMs ?? 8000}
                    min={500}
                    max={30000}
                    step={500}
                    onChange={(e) =>
                        patch({
                            timeoutMs: Math.max(
                                500,
                                Math.min(30000, parseInt(e.target.value, 10) || 8000)
                            ),
                        })
                    }
                />
            </Field>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Sub-editors                                                                */
/* -------------------------------------------------------------------------- */

const HeadersEditor: React.FC<{
    value: ApiHeader[];
    onChange: (next: ApiHeader[]) => void;
    variables: string[];
}> = ({ value, onChange }) => {
    return (
        <div className="space-y-2">
            {value.map((h, i) => (
                <div
                    key={i}
                    className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center"
                >
                    <TextInput
                        value={h.key}
                        onChange={(e) =>
                            onChange(
                                value.map((row, idx) =>
                                    idx === i
                                        ? { ...row, key: e.target.value }
                                        : row
                                )
                            )
                        }
                        placeholder="Header name"
                    />
                    <TextInput
                        value={h.value}
                        onChange={(e) =>
                            onChange(
                                value.map((row, idx) =>
                                    idx === i
                                        ? { ...row, value: e.target.value }
                                        : row
                                )
                            )
                        }
                        placeholder="Header value (supports {{vars.x}})"
                    />
                    <SmallButton
                        tone="danger"
                        onClick={() =>
                            onChange(value.filter((_, idx) => idx !== i))
                        }
                    >
                        <Trash2 className="w-3 h-3" />
                    </SmallButton>
                </div>
            ))}
            <button
                type="button"
                onClick={() =>
                    onChange([...value, { key: '', value: '' }])
                }
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-slate-900/20 text-[12px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/40 transition-colors"
            >
                <Plus className="w-3.5 h-3.5" /> Add header
            </button>
        </div>
    );
};

const ResponseMapEditor: React.FC<{
    value: ApiResponseMapEntry[];
    onChange: (next: ApiResponseMapEntry[]) => void;
}> = ({ value, onChange }) => {
    return (
        <div className="space-y-2">
            <p className="text-[11.5px] text-slate-500">
                Pull values out of the JSON response with a JSONPath like{' '}
                <code>$.data.id</code> or <code>$.items[0].name</code>.
            </p>
            {value.map((row, i) => (
                <div
                    key={i}
                    className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center"
                >
                    <TextInput
                        value={row.variable}
                        onChange={(e) =>
                            onChange(
                                value.map((r, idx) =>
                                    idx === i
                                        ? { ...r, variable: e.target.value }
                                        : r
                                )
                            )
                        }
                        placeholder="variable name"
                    />
                    <TextInput
                        value={row.jsonPath}
                        onChange={(e) =>
                            onChange(
                                value.map((r, idx) =>
                                    idx === i
                                        ? { ...r, jsonPath: e.target.value }
                                        : r
                                )
                            )
                        }
                        placeholder="$.path.to.value"
                    />
                    <SmallButton
                        tone="danger"
                        onClick={() =>
                            onChange(value.filter((_, idx) => idx !== i))
                        }
                    >
                        <Trash2 className="w-3 h-3" />
                    </SmallButton>
                </div>
            ))}
            <button
                type="button"
                onClick={() =>
                    onChange([...value, { variable: '', jsonPath: '$.' }])
                }
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-slate-900/20 text-[12px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/40 transition-colors"
            >
                <Plus className="w-3.5 h-3.5" /> Map response field
            </button>
        </div>
    );
};
