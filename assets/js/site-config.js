/* Nerovique storefront settings.
   Sales stay closed until Polar confirms payments for the account.
   To open sales, set salesOpen to true. The checkout URL below is the live
   Polar checkout link for the product (created 25 Nov 2026). */
window.NEROVIQUE_CONFIG = {
  salesOpen: false,
  products: {
    "ecommerce-conversion": {
      checkoutUrl: "https://buy.polar.sh/polar_cl_JZ0wuhR40mWg1V3njIMzENAClpZTswOwK9mdK3xacd7",
      closedLabel: "Checkout opens soon",
      openLabel: "Buy now · USD 59.90"
    }
  }
};
