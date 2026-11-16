// Public marketing configuration. Nothing here is secret; never add access tokens.
// LinkedIn stays completely off (no request, no cookie) while partnerId is empty.
window.MARVEL_MARKETING = {
  linkedin: {
    // Campaign Manager → Analyze → Insight Tag → "I will install the tag myself".
    partnerId: '',
    // Optional event-specific conversion IDs from Campaign Manager → Analyze → Conversion tracking.
    // Leave any of them empty to skip that event. URL-based conversions need no ID here.
    conversions: {
      reservePage: '',        // the reservation page was opened
      reviewReservation: '',  // "Review reservation" was pressed
      continueToPayment: ''   // "Continue to payment" was pressed (visitor leaves for Shopify checkout)
    }
  }
};
