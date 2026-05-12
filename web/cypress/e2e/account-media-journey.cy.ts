describe("account and media journeys", () => {
  it("redirects unauthenticated users", () => {
    cy.visit("/account");
    cy.location("pathname").should("eq", "/auth/sign-in/");
  });

  it("completes the signed-in workflow", () => {
    const email = `creator+journey-${Date.now()}@example.com`;

    cy.request("POST", `${Cypress.env("apiBaseUrl")}/auth/request-link`, { email }).then((challengeResponse) => {
      const code = challengeResponse.body.developmentCode as string;
      cy.request("POST", `${Cypress.env("apiBaseUrl")}/auth/verify`, {
        email,
        code,
        deviceName: "Cypress browser",
      }).then((verifyResponse) => {
        cy.visit("/account", {
          onBeforeLoad(window) {
            window.localStorage.setItem("onlyfling-token", verifyResponse.body.token as string);
          },
        });
      });
    });

    cy.location("pathname", { timeout: 10000 }).should("eq", "/account/");
    cy.get('input').first().clear().type("Journey Creator");
    cy.get('input[type="email"]').clear().type(email);
    cy.contains("Save profile").click();
    cy.contains("Profile saved");

    cy.visit("/account/settings");
    cy.contains("Save settings").click();
    cy.contains("Canonical settings updated");

    cy.visit("/media");
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from("fake-image-content"),
      fileName: "cover.jpg",
      mimeType: "image/jpeg",
      lastModified: Date.now(),
    });
    cy.contains("Create collection").click();
    cy.get('input[type="checkbox"]').eq(0).check({ force: true });
    cy.get('input[type="checkbox"]').eq(1).check({ force: true });
    cy.contains("Start background upload").click();
    cy.wait(1500);

    cy.visit("/earnings");
    cy.contains("Earnings and payouts");
    cy.contains("Request payout").click();

    cy.visit("/account/security");
    cy.contains("button", "Close account").should("be.disabled");
  });
});
