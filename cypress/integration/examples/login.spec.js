context("Home", () => {
  // beforeEach(() => {
  //   cy.visit("https://dial-next.web.cern.ch");
  // });

  // https://on.cypress.io/interacting-with-elements

  it("redirects to login if not logged in", () => {
    cy.visit("https://macbook-cdaic.cern.ch:3000");
    cy.url().should('include', '/login');
  });

});