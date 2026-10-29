// Reservation settings for reserve.html (Claude, 2026-10-29). The page reads everything it links to from here, so the
// live payment links and legal documents drop in without touching the page.
window.MARVEL_RESERVE = {
  email: 'hello@marvellabs.com',
  // Stripe Payment Link for the $100 deposit, one per size. Empty: Reserve opens an email with the visitor's details instead.
  checkout: {'20': '', '16': ''},
  // Reservation Agreement / Terms of Use / Privacy Policy. Empty: the name shows as plain text, not a link.
  legal: {agreement: '', terms: '', privacy: 'privacy.html'},
  // 'implicit': "By clicking Reserve, I agree to..." (Tesla's style). 'checkbox': a required "I agree" box above the button.
  consent: 'implicit'
};
