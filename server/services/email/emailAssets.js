const fs = require('fs');
const path = require('path');

/**
 * Resolve inline logo attachment (CID) so the logo always renders in Gmail.
 *
 * @returns {{ logoCid: (string|undefined), attachments: Array<{filename:string,path:string,cid:string}> }}
 */
function getBrandingAttachments() {
    const cid = (process.env.EMAIL_LOGO_CID || 'brandlogo').toString().trim() || 'brandlogo';
    const explicitPath = process.env.EMAIL_LOGO_PATH ? process.env.EMAIL_LOGO_PATH.toString().trim() : '';
    const defaultPath = path.resolve(__dirname, '../../../public/logoNT512.png');
    const resolvedPath = explicitPath ? path.resolve(explicitPath) : defaultPath;

    if (!fs.existsSync(resolvedPath)) return { logoCid: undefined, attachments: [] };

    return {
        logoCid: cid,
        attachments: [
            {
                filename: 'logo.png',
                path: resolvedPath,
                cid
            }
        ]
    };
}

module.exports = { getBrandingAttachments };

