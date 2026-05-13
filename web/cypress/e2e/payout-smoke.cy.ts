describe("payout screenshot smoke", () => {
  it("captures the payouts screen", () => {
    const email = `creator+payout-${Date.now()}@example.com`;

    cy.request("POST", `${Cypress.env("apiBaseUrl")}/auth/request-link`, { email }).then((challengeResponse) => {
      const code = challengeResponse.body.developmentCode as string | undefined;
      if (!code) {
        cy.visit("/earnings");
        cy.screenshot("earnings-payouts-sign-in");
        return;
      }

      cy.request("POST", `${Cypress.env("apiBaseUrl")}/auth/verify`, {
        email,
        code,
        deviceName: "Cypress screenshot browser",
      }).then((verifyResponse) => {
        cy.visit("/earnings", {
          onBeforeLoad(window) {
            window.localStorage.setItem("onlyfling-token", verifyResponse.body.token as string);
          },
        });
      });
    });

    cy.get("body", { timeout: 10000 });
    cy.screenshot("earnings-payouts");
  });
});
