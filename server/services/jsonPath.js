/**
 * Light JSONPath for the flow runtime's API responseMap.
 *
 * Supports the subset clients actually need to extract values from REST APIs:
 *   $                        the root
 *   $.foo.bar                dotted access
 *   $.foo[0]                 array index
 *   $.foo[0].bar             mixed
 *   $['weird key'].bar       bracket-quoted key (single or double quotes)
 *   $..id                    recursive descent (returns first match unless `all` is true)
 *
 * Not supported (deliberately): filter expressions ($..[?(@.x>1)]), slices, unions, regex.
 * Clients who need that can map to a variable and use a Branch node.
 *
 * Returns `undefined` on any miss so the caller can decide how to fall back
 * (e.g. skip writing the variable, route to onErrorNodeId).
 */

/**
 * Tokenize a JSONPath expression into a list of step descriptors.
 *
 * @param {string} expr
 * @returns {Array<{ kind: 'key'|'index'|'recurse', value?: string|number, recurseKey?: string }>}
 */
function tokenize(expr) {
    if (typeof expr !== 'string') throw new Error('jsonPath: expression must be a string');
    let s = expr.trim();
    if (s.startsWith('$')) s = s.slice(1);
    const tokens = [];
    let i = 0;
    while (i < s.length) {
        const ch = s[i];
        if (ch === '.') {
            // recursive descent: '..key'
            if (s[i + 1] === '.') {
                let j = i + 2;
                let key = '';
                while (j < s.length && /[\w-]/.test(s[j])) {
                    key += s[j];
                    j++;
                }
                if (!key) throw new Error('jsonPath: recursive descent requires a key');
                tokens.push({ kind: 'recurse', recurseKey: key });
                i = j;
            } else {
                i += 1;
                let key = '';
                while (i < s.length && /[\w-]/.test(s[i])) {
                    key += s[i];
                    i++;
                }
                if (!key) throw new Error(`jsonPath: empty key at offset ${i}`);
                tokens.push({ kind: 'key', value: key });
            }
        } else if (ch === '[') {
            const end = s.indexOf(']', i);
            if (end === -1) throw new Error('jsonPath: unbalanced bracket');
            const inner = s.slice(i + 1, end).trim();
            if (/^-?\d+$/.test(inner)) {
                tokens.push({ kind: 'index', value: parseInt(inner, 10) });
            } else if (
                (inner.startsWith("'") && inner.endsWith("'")) ||
                (inner.startsWith('"') && inner.endsWith('"'))
            ) {
                tokens.push({ kind: 'key', value: inner.slice(1, -1) });
            } else {
                throw new Error(`jsonPath: unsupported bracket selector "${inner}"`);
            }
            i = end + 1;
        } else {
            // implicit first key (e.g. "data.x" without leading '.')
            let key = '';
            while (i < s.length && /[\w-]/.test(s[i])) {
                key += s[i];
                i++;
            }
            if (!key) throw new Error(`jsonPath: unexpected character "${ch}"`);
            tokens.push({ kind: 'key', value: key });
        }
    }
    return tokens;
}

/**
 * Recursively search for the first occurrence of `key` in `obj`.
 * Used by the `..key` operator. Returns undefined if not found.
 *
 * @param {any} obj
 * @param {string} key
 * @returns {any}
 */
function findRecursive(obj, key) {
    if (obj == null) return undefined;
    if (typeof obj !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const hit = findRecursive(item, key);
            if (hit !== undefined) return hit;
        }
        return undefined;
    }
    for (const v of Object.values(obj)) {
        const hit = findRecursive(v, key);
        if (hit !== undefined) return hit;
    }
    return undefined;
}

/**
 * Resolve a JSONPath expression against a JSON-like root.
 *
 * @param {any} root - the parsed response body (object/array/primitive).
 * @param {string} expr - JSONPath expression (e.g. "$.data.orders[0].id").
 * @returns {any} the resolved value or undefined.
 */
function query(root, expr) {
    if (root == null) return undefined;
    if (!expr || expr === '$') return root;
    let tokens;
    try {
        tokens = tokenize(expr);
    } catch (e) {
        return undefined;
    }
    let cur = root;
    for (const tok of tokens) {
        if (cur == null) return undefined;
        switch (tok.kind) {
            case 'key':
                cur = cur[tok.value];
                break;
            case 'index':
                if (!Array.isArray(cur)) return undefined;
                cur = cur[tok.value < 0 ? cur.length + tok.value : tok.value];
                break;
            case 'recurse':
                cur = findRecursive(cur, tok.recurseKey);
                break;
            default:
                return undefined;
        }
    }
    return cur;
}

module.exports = { query, tokenize };
