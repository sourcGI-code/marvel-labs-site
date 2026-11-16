// LinkedIn Insight Tag and reservation conversions. Loads only when a Partner ID
// is configured in marketing-config.js, and never for visitors who send a
// Global Privacy Control or Do Not Track signal.
const config = window.MARVEL_MARKETING?.linkedin || {};
const partnerId = String(config.partnerId || '').trim();
const optedOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';

export function linkedinConversion(name) {
  const id = Number(config.conversions?.[name]);
  if (!partnerId || optedOut || !Number.isInteger(id) || id <= 0 || typeof window.lintrk !== 'function') return false;
  window.lintrk('track', {conversion_id: id});
  return true;
}

if (/^\d{3,12}$/.test(partnerId) && !optedOut) {
  window._linkedin_partner_id = partnerId;
  (window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []).push(partnerId);
  if (!window.lintrk) {
    window.lintrk = (action, data) => { window.lintrk.q.push([action, data]); };
    window.lintrk.q = [];
  }
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  document.head.append(tag);

  const section = document.querySelector('section.reserve-stage[data-page="reserve"]');
  const form = section?.querySelector('form.rv-rail');
  if (form) {
    linkedinConversion('reservePage');
    // Capture phase: read the step before the reservation script advances it.
    form.addEventListener('submit', () => {
      const step = section.dataset.orderStep || 'configure';
      if (step === 'configure') linkedinConversion('reviewReservation');
      else if (step === 'review' && form.querySelector('[name="consent"]')?.checked) linkedinConversion('continueToPayment');
    }, true);
  }
}
