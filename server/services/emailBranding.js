/**
 * @typedef {Object} WrapEmailHtmlParams
 * @property {string} subject - Email subject (used as heading text fallback).
 * @property {string} bodyHtml - The existing email HTML body (already formatted).
 * @property {string=} logoUrl - Optional absolute URL for the logo image.
 * @property {string=} logoCid - Optional cid for inline attachments (e.g. "brandlogo").
 * @property {string=} brandName - Optional brand name for alt text and header.
 */

/**
 * Wrap existing HTML in a consistent branded layout.
 * This ensures the logo is visible inside the email body even when Gmail doesn't show a sender avatar.
 *
 * @param {WrapEmailHtmlParams} params
 * @returns {string}
 */
function wrapEmailHtml({ subject, bodyHtml, logoUrl, logoCid, brandName }) {
    const safeBrand = (brandName || 'ChatBot Support').toString().trim() || 'ChatBot Support';
    const safeSubject = (subject || safeBrand).toString();

    const resolvedLogoSrc = logoCid ? `cid:${logoCid}` : logoUrl;

    const textStack = `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.25; text-align: left;">
            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${safeBrand}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${safeSubject}</div>
        </div>
    `;

    const header = resolvedLogoSrc
        ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                <tr>
                    <td align="center" style="padding: 16px 20px 14px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                            <tr>
                                <td valign="middle" style="padding-right: 10px;">
                                    <img src="${resolvedLogoSrc}" alt="${safeBrand} logo" width="36" height="36" style="display: block; width: 36px; height: 36px; object-fit: contain; border-radius: 8px;" />
                                </td>
                                <td valign="middle">${textStack}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        `
        : `
            <div style="padding: 16px 20px 14px; border-bottom: 1px solid #e2e8f0; background:#ffffff; text-align: center; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
                <div style="display: inline-block; text-align: left;">
                    <div style="font-size:14px; font-weight:700; color:#0f172a;">${safeBrand}</div>
                    <div style="font-size:12px; color:#64748b; margin-top:4px;">${safeSubject}</div>
                </div>
            </div>
        `;

    return `
        <div style="background:#f8fafc; padding: 16px;">
            <div style="max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow:hidden; background:#ffffff;">
                ${header}
                <div style="padding: 20px 22px;">
                    ${bodyHtml}
                </div>
                <div style="padding: 12px 20px; border-top: 1px solid #e2e8f0; background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 11px; color:#94a3b8; text-align: center;">
                    Automated message · reply if you need help
                </div>
            </div>
        </div>
    `;
}

/**
 * Resolve branding values for email templates.
 *
 * @returns {{ logoUrl: (string|undefined), logoCid: (string|undefined), brandName: string }}
 */
function getEmailBranding() {
    const brandName = (process.env.EMAIL_BRAND_NAME || 'ChatBot Support').toString().trim() || 'ChatBot Support';
    const logoUrlRaw = process.env.EMAIL_LOGO_URL ? process.env.EMAIL_LOGO_URL.toString().trim() : '';
    const logoUrl = logoUrlRaw && /^https?:\/\//i.test(logoUrlRaw) ? logoUrlRaw : undefined;
    const logoCid = process.env.EMAIL_LOGO_CID ? process.env.EMAIL_LOGO_CID.toString().trim() : undefined;
    return { logoUrl, logoCid, brandName };
}

module.exports = { wrapEmailHtml, getEmailBranding };

