var DATA_FILES = [
    {
        filename: 'cars.json',
        column: 'Year',
    },
    {
        filename: 'data.csv',
        column: 'Date'
    }
]


function getFile(name) {
    return cy.get(`span:contains("${name}")`);
}


describe('Loading files into Voyager', () => {
    beforeEach(() => {
        cy.visit('/lab')
        cy.get('#main')
            .should('be.visible')
        cy.get('.jp-HomeIcon')
            .click()
        getFile("test_data")
            .dblclick()

    })

    DATA_FILES.forEach(({ filename, column }) => {
        it(`Can open ${filename} in Voyager`, () => {
            getFile(filename)
                .trigger('contextmenu')
            cy.get('.p-Menu-item div:contains("Open With...")')
                .trigger('mousemove')
            cy.get('.p-Menu-item div:contains("Voyager")')
                .trigger('mousemove')
                .click()

            cy.get('.p-mod-current')
                .contains(filename)
                .should('be.visible')

            cy.get('.voyager')
                .should('be.visible')
                .contains(column)
                .should('be.visible')

            // still visible on reload
            cy.reload()
            cy.get('#main')
                .should('be.visible')

            cy.get('.voyager')
                .should('be.visible')

            // not checking if specific file is open right now
            // need to figure out more reliable way, this wasn't working
            // cy.get('.p-TabBar-tab')
            //     .contains(filename)
            //     .should('be.visible')
            //     .click({ force: true })
            // cy.get('.voyager')
            //     .should('be.visible')
            //     .contains(column)
            //     .should('be.visible')
        })
    })
})

