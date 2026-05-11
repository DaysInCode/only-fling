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
});
