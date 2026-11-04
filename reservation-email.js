const SITE = 'https://sourcgi-code.github.io/marvel-labs-site/';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const headerText = value => String(value ?? '').replace(/[\r\n]/g, ' ').trim();

// Pure template: preparing or downloading a message does not send it.
export function createReservationEmail(record, contact = {}) {
  const cancelled = record.status === 'cancelled';
  const subject = `[DEMO] ${cancelled ? 'Cancellation' : 'Reservation'} confirmation — ${record.id}`;
  const recipient = headerText(contact.email);
  const greeting = contact.name?.trim() ? `Hi ${contact.name.trim()},` : 'Hello,';
  const heading = cancelled ? 'Your cancellation is confirmed.' : 'Your next chapter starts here.';
  const intro = cancelled
    ? 'Your demo reservation has been cancelled. The full $100 refund below is simulated; no money was charged or refunded.'
    : 'Your demo reservation is confirmed. Here is your reservation number and the configuration you selected.';
  const details = [
    ['Reservation number', record.id],
    ['Trailer', `${record.size} ft · Mirror Graphite`],
    ['Plan', record.plan === 'buy' ? 'Buy · 75% operator profit share' : 'Lease · 25% operator profit share'],
    ['Factory / rear cargo', record.size === '16' ? '6 ft 2½ in / 9 ft 9½ in' : '6 ft 2½ in / 13 ft 9½ in'],
    [cancelled ? 'Refund preview' : 'Deposit preview', '$100 USD · fully refundable'],
    ['Status', cancelled ? 'Cancelled · demo' : 'Reserved · demo']
  ];
  const agreement = `${SITE}reservation-agreement.html?size=${encodeURIComponent(record.size)}&plan=${encodeURIComponent(record.plan)}`;
  const help = `${SITE}reservation-help.html`;
  const preview = `${SITE}reserve.html?v=reservation-preview-v2`;
  const next = cancelled
    ? 'You can return to the website to try another configuration.'
    : 'In the proposed live process, the deposit would be credited toward your trailer’s final price. Final specifications, delivery timing and Buy or Lease terms would be confirmed separately. No automatic balance payment is authorized.';
  const disclaimer = 'This is a demonstration. No real payment was made, no production slot was reserved, and this message is not proof of a purchase or lease.';
  const text = [greeting, '', intro, '', ...details.map(([key, value]) => `${key}: ${value}`), '', next, '', disclaimer, '', `View the draft agreement: ${agreement}`, `Return to the reservation preview: ${preview}`, '', `Reservation help: ${help}`, 'Marvel Labs'].join('\n');
  const table = details.map(([key, value]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #273034;color:#a7b2b5;font-size:13px;vertical-align:top">${escapeHTML(key)}</td><td style="padding:12px 0 12px;border-bottom:1px solid #273034;text-align:right;font-size:13px;vertical-align:top">${escapeHTML(value)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHTML(subject)}</title></head><body style="margin:0;background:#0a0e10;color:#edf1f1;font-family:Arial,Helvetica,sans-serif"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:32px 20px"><table role="presentation" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse"><tr><td style="padding:0 0 28px;font-size:19px;font-weight:bold;letter-spacing:4px">MARVEL LABS</td></tr><tr><td style="font-size:10px;letter-spacing:2px;color:#4dd8e8;padding-bottom:20px">RESERVATION PREVIEW · NO CHARGE</td></tr><tr><td><h1 style="font-size:32px;line-height:1.15;font-weight:400;letter-spacing:-1px;margin:0 0 24px">${heading}</h1><p style="font-size:14px;line-height:1.7">${escapeHTML(greeting)}</p><p style="font-size:14px;line-height:1.7;color:#bac4c6">${escapeHTML(intro)}</p><div style="margin:24px 0;padding:20px;border:1px solid #355057;background:#101719"><span style="font-size:10px;letter-spacing:1px;color:#a7b2b5">YOUR RESERVATION NUMBER</span><p style="font-family:monospace;font-size:23px;color:#4dd8e8;margin:10px 0 0;overflow-wrap:anywhere">${escapeHTML(record.id)}</p></div><table style="width:100%;border-collapse:collapse">${table}</table><p style="font-size:13px;line-height:1.75;color:#bac4c6;margin:28px 0">${escapeHTML(next)}</p><p style="font-size:13px;line-height:1.8"><a target="_blank" rel="noopener noreferrer" href="${escapeHTML(agreement)}" style="color:#4dd8e8">View your draft agreement ↗</a><br><a target="_blank" rel="noopener noreferrer" href="${escapeHTML(preview)}" style="color:#edf1f1">Return to the reservation preview ↗</a></p><p style="font-size:11px;line-height:1.75;color:#a7b2b5;border-top:1px solid #273034;padding-top:24px;margin-top:28px">${disclaimer}</p><p style="font-size:12px;line-height:1.6;color:#a7b2b5">Marvel Labs<br><a href="${escapeHTML(help)}" style="color:#edf1f1">Reservation help</a></p></td></tr></table></td></tr></table></body></html>`;
  return {subject, recipient, text, html};
}

export function emailDraft(message) {
  // RFC 2047 subject and UTF-8 base64 body keep the .eml safe across mail clients.
  const encode = text => btoa(Array.from(new TextEncoder().encode(text), byte => String.fromCharCode(byte)).join(''));
  const body = encode(message.html).match(/.{1,76}/g).join('\r\n');
  return ['X-Unsent: 1', 'MIME-Version: 1.0', ...(message.recipient ? [`To: ${headerText(message.recipient)}`] : []),
    `Subject: =?UTF-8?B?${encode(headerText(message.subject))}?=`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body].join('\r\n');
}
