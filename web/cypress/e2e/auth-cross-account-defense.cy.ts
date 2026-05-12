function signInAs(email: string, deviceName: string) {
  return cy
    .request("POST", `${Cypress.env("apiBaseUrl")}/auth/request-link`, { email })
    .then((challengeResponse) => {
      const code = challengeResponse.body.developmentCode as string;
      return cy.request("POST", `${Cypress.env("apiBaseUrl")}/auth/verify`, { email, code, deviceName });
    })
    .then((verifyResponse) =>
      cy.request({
        method: "GET",
        url: `${Cypress.env("apiBaseUrl")}/me`,
        headers: {
          authorization: `Bearer ${verifyResponse.body.token}`,
        },
      }).then((meResponse) => ({
        token: verifyResponse.body.token as string,
        userId: meResponse.body.user.userId as string,
        sessionId: meResponse.body.user.sessionId as string,
      })),
    );
}

describe("cross-account defense", () => {
  it("prevents account-scoped cross-user actions", () => {
    const id = Date.now();
    const userAEmail = `creator+a-${id}@example.com`;
    const userBEmail = `creator+b-${id}@example.com`;

    signInAs(userAEmail, "A primary").then((userA) => {
      signInAs(userAEmail, "A tablet").then((userASecondSession) => {
        signInAs(userBEmail, "B primary").then((userB) => {
          cy.request({
            method: "POST",
            url: `${Cypress.env("apiBaseUrl")}/media/collections`,
            headers: { authorization: `Bearer ${userA.token}` },
            body: {
              folderName: `a-folder-${id}`,
              title: "A collection",
              description: "Only user A should control this collection.",
              visibility: "private",
              publishState: "draft",
              priceMinor: 0,
              currency: "GBP",
            },
          }).then((collectionResponse) => {
            const collectionId = collectionResponse.body.collection.id as string;

            cy.request({
              method: "POST",
              failOnStatusCode: false,
              url: `${Cypress.env("apiBaseUrl")}/media/collections/delete`,
              headers: { authorization: `Bearer ${userB.token}` },
              body: { collectionId },
            }).its("status").should("eq", 404);

            cy.request({
              method: "POST",
              failOnStatusCode: false,
              url: `${Cypress.env("apiBaseUrl")}/account/sessions/revoke`,
              headers: { authorization: `Bearer ${userB.token}` },
              body: { sessionId: userASecondSession.sessionId },
            }).its("status").should("eq", 404);

            cy.request({
              method: "GET",
              url: `${Cypress.env("apiBaseUrl")}/account/audit?limit=50`,
              headers: { authorization: `Bearer ${userB.token}` },
            }).then((auditResponse) => {
              const body = JSON.stringify(auditResponse.body);
              expect(body).not.to.contain(collectionId);
              expect(body).not.to.contain(userASecondSession.sessionId);
            });
          });
        });
      });
    });
  });
});
