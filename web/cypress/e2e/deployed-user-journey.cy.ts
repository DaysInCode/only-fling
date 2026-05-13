const remoteAuthToken = String(Cypress.env("BDD_REMOTE_AUTH_TOKEN") ?? "").trim();
const describeOrSkip = remoteAuthToken ? describe : describe.skip;

function signInOnDeployedApp(email: string, deviceName: string) {
  return cy
    .request({
      method: "POST",
      url: `${Cypress.env("apiBaseUrl")}/auth/request-link`,
      headers: {
        "x-bdd-remote-auth": remoteAuthToken,
      },
      body: { email },
    })
    .then((challengeResponse) => {
      const code = challengeResponse.body.developmentCode as string;
      if (typeof code !== "string" || !code.length) {
        throw new Error("remote development code was not returned");
      }

      return cy.request("POST", `${Cypress.env("apiBaseUrl")}/auth/verify`, {
        email,
        code,
        deviceName,
      });
    })
    .then((verifyResponse) => verifyResponse.body.token as string);
}

describeOrSkip("deployed creator journey", () => {
  it("covers sign-in, profile, upload, dashboard, and mobile entry points", () => {
    const email = `bdd-journey-${Date.now()}@example.com`;

    cy.viewport(390, 844);
    cy.visit("/");
    cy.contains("Mobile-first growth, five-click onboarding, secure creator operations.");
    cy.contains("Auth → profile → settings → upload consent → first priced collection.");

    cy.visit("/auth/sign-in");
    cy.get('[data-cy="auth-email"]').should("be.visible");
    cy.get('[data-cy="auth-mobile"]').should("be.visible");
    cy.get('[data-cy="auth-sso-github"]').should("be.disabled");
    cy.get('[data-cy="auth-sso-microsoft"]').should("be.disabled");
    cy.get('[data-cy="auth-sso-facebook"]').should("be.disabled");

    cy.viewport(1440, 1024);
    signInOnDeployedApp(email, "BDD Journey Browser").then((token) => {
      cy.visit("/account", {
        onBeforeLoad(window) {
          window.localStorage.setItem("onlyfling-token", token);
        },
      });
    });

    cy.location("pathname", { timeout: 20000 }).should("eq", "/account/");
    cy.get('[data-cy="account-display-name"]').clear().type("BDD Journey Creator");
    cy.get('[data-cy="account-support-email"]').clear().type(email);
    cy.get('[data-cy="account-avatar-url"]').clear().type("https://example.com/avatar.jpg");
    cy.get('[data-cy="account-bio"]').clear().type("Deployed creator journey.");
    cy.get('[data-cy="account-save-profile"]').click();
    cy.contains("Profile saved and account summary refreshed.");

    cy.visit("/dashboard");
    cy.contains(email);
    cy.contains("Creator + operator dashboard");

    cy.visit("/media");
    cy.get('[data-cy="media-create-collection"]').click();
    cy.contains("Collection created.");
    cy.get('[data-cy="media-upload-file"]').selectFile({
      contents: Cypress.Buffer.from("journey-image-content"),
      fileName: "journey.jpg",
      mimeType: "image/jpeg",
      lastModified: Date.now(),
    });
    cy.get('input[type="checkbox"]').eq(0).check({ force: true });
    cy.get('input[type="checkbox"]').eq(1).check({ force: true });
    cy.get('[data-cy="media-start-upload"]').click();
    cy.contains("Upload staged. Background processing is running.", { timeout: 30000 });
  });
});
