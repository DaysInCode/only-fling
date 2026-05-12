describe("OnlyFling starter", () => {
  it("renders the homepage", () => {
    cy.visit("/");
    cy.contains("OnlyFling Starter");
    cy.contains("Mobile-first growth");
  });

  it("renders the sign-in page", () => {
    cy.visit("/auth/sign-in");
    cy.contains("Passwordless sign-in");
    cy.contains("Request code");
  });

  it("renders the collaboration page", () => {
    cy.visit("/collaboration");
    cy.contains("Nearby collaboration discovery");
    cy.contains("Save collaboration profile");
  });

  it("renders the community page", () => {
    cy.visit("/community");
    cy.contains("Community growth and requests");
    cy.contains("Submit request");
  });

  it("renders the requests page", () => {
    cy.visit("/requests");
    cy.contains("Request outlet and promises");
    cy.contains("Create request");
  });

  it("renders the studio page", () => {
    cy.visit("/studio");
    cy.contains("Collab Studio");
    cy.contains("Create session");
  });
});
