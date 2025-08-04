const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline/promises');

// Updated path to use your specified directory.
const dbPath = path.join('D:', 'database', 'nautilus.db');

class DatabaseManager {
    constructor() {
        this.db = new Database(dbPath);
        // console.log('Successfully connected to the database at', dbPath);
        this.applySchema();
    }

    applySchema() {
        const schema = `
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS ships (
                ship_id INTEGER PRIMARY KEY AUTOINCREMENT,
                ship_name TEXT NOT NULL,
                imo_number TEXT NOT NULL UNIQUE,
                ship_type TEXT NOT NULL,
                call_sign TEXT UNIQUE,
                flag TEXT
            );

            CREATE TABLE IF NOT EXISTS crew (
                crew_id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                date_of_birth DATE NOT NULL,
                nationality TEXT NOT NULL,
                passport_number TEXT NOT NULL UNIQUE,
                seaman_book_number TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS voyages (
                voyage_id INTEGER PRIMARY KEY AUTOINCREMENT,
                ship_id INTEGER NOT NULL,
                voyage_number TEXT NOT NULL UNIQUE,
                departure_port TEXT NOT NULL,
                destination_port TEXT NOT NULL,
                departure_date TIMESTAMP NOT NULL,
                estimated_arrival_date TIMESTAMP,
                actual_arrival_date TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'Scheduled',
                FOREIGN KEY (ship_id) REFERENCES ships (ship_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crew_manifest (
                manifest_id INTEGER PRIMARY KEY AUTOINCREMENT,
                voyage_id INTEGER NOT NULL,
                crew_id INTEGER NOT NULL,
                assigned_rank TEXT NOT NULL,
                sign_on_date DATE NOT NULL,
                sign_off_date DATE,
                FOREIGN KEY (voyage_id) REFERENCES voyages (voyage_id) ON DELETE CASCADE,
                FOREIGN KEY (crew_id) REFERENCES crew (crew_id) ON DELETE CASCADE,
                UNIQUE(voyage_id, crew_id)
            );

            CREATE TABLE IF NOT EXISTS cargo_manifest (
                cargo_id INTEGER PRIMARY KEY AUTOINCREMENT,
                voyage_id INTEGER NOT NULL,
                bill_of_lading_number TEXT UNIQUE,
                description TEXT NOT NULL,
                cargo_type TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                stowage_location TEXT,
                is_hazardous BOOLEAN NOT NULL DEFAULT 0,
                imo_class TEXT,
                special_handling_notes TEXT,
                FOREIGN KEY (voyage_id) REFERENCES voyages (voyage_id) ON DELETE CASCADE
            );
        `;
        this.db.exec(schema);
    }

    // --- Ship Methods ---
    addShip(shipData) {
        const { ship_name, imo_number, ship_type, call_sign, flag } = shipData;
        const sql = `INSERT INTO ships (ship_name, imo_number, ship_type, call_sign, flag)
                     VALUES (?, ?, ?, ?, ?)`;
        return this.db.prepare(sql).run(ship_name, imo_number, ship_type, call_sign, flag);
    }

    getShipByIMO(imoNumber) {
        return this.db.prepare(`SELECT * FROM ships WHERE imo_number = ?`).get(imoNumber);
    }
    
    getAllShips() {
        return this.db.prepare(`SELECT * FROM ships ORDER BY ship_name`).all();
    }
    
    updateShip(ship_id, shipData) {
        const { ship_name, imo_number, ship_type, call_sign, flag } = shipData;
        const sql = `UPDATE ships SET ship_name = ?, imo_number = ?, ship_type = ?, call_sign = ?, flag = ? WHERE ship_id = ?`;
        return this.db.prepare(sql).run(ship_name, imo_number, ship_type, call_sign, flag, ship_id);
    }

    deleteShip(ship_id) {
        const sql = `DELETE FROM ships WHERE ship_id = ?`;
        return this.db.prepare(sql).run(ship_id);
    }

    // --- Crew Methods ---
    addCrew(crewData) {
        const { first_name, last_name, date_of_birth, nationality, passport_number, seaman_book_number } = crewData;
        const sql = `INSERT INTO crew (first_name, last_name, date_of_birth, nationality, passport_number, seaman_book_number)
                     VALUES (?, ?, ?, ?, ?, ?)`;
        return this.db.prepare(sql).run(first_name, last_name, date_of_birth, nationality, passport_number, seaman_book_number);
    }

    getAllCrew() {
        return this.db.prepare(`SELECT * FROM crew ORDER BY last_name, first_name`).all();
    }

    getCrewByPassport(passportNumber) {
        return this.db.prepare(`SELECT * FROM crew WHERE passport_number = ?`).get(passportNumber);
    }

    updateCrew(crew_id, crewData) {
        const { first_name, last_name, date_of_birth, nationality, passport_number, seaman_book_number } = crewData;
        const sql = `UPDATE crew SET first_name = ?, last_name = ?, date_of_birth = ?, nationality = ?, passport_number = ?, seaman_book_number = ? WHERE crew_id = ?`;
        return this.db.prepare(sql).run(first_name, last_name, date_of_birth, nationality, passport_number, seaman_book_number, crew_id);
    }

    deleteCrew(crew_id) {
        const sql = `DELETE FROM crew WHERE crew_id = ?`;
        return this.db.prepare(sql).run(crew_id);
    }
    
    // --- Voyage Methods ---
    addVoyage(voyageData) {
        const { ship_id, voyage_number, departure_port, destination_port, departure_date, estimated_arrival_date } = voyageData;
        const sql = `INSERT INTO voyages (ship_id, voyage_number, departure_port, destination_port, departure_date, estimated_arrival_date)
                     VALUES (?, ?, ?, ?, ?, ?)`;
        return this.db.prepare(sql).run(ship_id, voyage_number, departure_port, destination_port, departure_date, estimated_arrival_date);
    }
    
    getAllVoyages() {
        return this.db.prepare(`SELECT v.*, s.ship_name FROM voyages v JOIN ships s ON v.ship_id = s.ship_id ORDER BY v.departure_date DESC`).all();
    }

    getVoyageByNumber(voyageNumber) {
        return this.db.prepare(`SELECT * FROM voyages WHERE voyage_number = ?`).get(voyageNumber);
    }
    
    updateVoyage(voyage_id, voyageData) {
        const { ship_id, voyage_number, departure_port, destination_port, departure_date, estimated_arrival_date, actual_arrival_date, status } = voyageData;
        const sql = `UPDATE voyages SET ship_id = ?, voyage_number = ?, departure_port = ?, destination_port = ?, departure_date = ?, estimated_arrival_date = ?, actual_arrival_date = ?, status = ? WHERE voyage_id = ?`;
        return this.db.prepare(sql).run(ship_id, voyage_number, departure_port, destination_port, departure_date, estimated_arrival_date, actual_arrival_date, status, voyage_id);
    }

    deleteVoyage(voyage_id) {
        const sql = `DELETE FROM voyages WHERE voyage_id = ?`;
        return this.db.prepare(sql).run(voyage_id);
    }

    // --- Crew Manifest Methods ---
    assignCrewToVoyage(assignmentData) {
        const { voyage_id, crew_id, assigned_rank, sign_on_date } = assignmentData;
        const sql = `INSERT INTO crew_manifest (voyage_id, crew_id, assigned_rank, sign_on_date)
                     VALUES (?, ?, ?, ?)`;
        return this.db.prepare(sql).run(voyage_id, crew_id, assigned_rank, sign_on_date);
    }
    
    getCrewForVoyage(voyageId) {
        const sql = `SELECT cm.manifest_id, c.first_name, c.last_name, cm.assigned_rank, cm.sign_on_date
                     FROM crew_manifest cm
                     JOIN crew c ON cm.crew_id = c.crew_id
                     WHERE cm.voyage_id = ?`;
        return this.db.prepare(sql).all(voyageId);
    }
    
    updateCrewAssignment(manifest_id, assignmentData) {
        const { assigned_rank, sign_off_date } = assignmentData;
        const sql = `UPDATE crew_manifest SET assigned_rank = ?, sign_off_date = ? WHERE manifest_id = ?`;
        return this.db.prepare(sql).run(assigned_rank, sign_off_date, manifest_id);
    }

    removeCrewFromVoyage(manifest_id) {
        const sql = `DELETE FROM crew_manifest WHERE manifest_id = ?`;
        return this.db.prepare(sql).run(manifest_id);
    }

    // --- Cargo Manifest Methods ---
    addCargo(cargoData) {
        const { voyage_id, bill_of_lading_number, description, cargo_type, quantity, unit, stowage_location, is_hazardous, imo_class, special_handling_notes } = cargoData;
        const sql = `INSERT INTO cargo_manifest (voyage_id, bill_of_lading_number, description, cargo_type, quantity, unit, stowage_location, is_hazardous, imo_class, special_handling_notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        return this.db.prepare(sql).run(voyage_id, bill_of_lading_number, description, cargo_type, quantity, unit, stowage_location, is_hazardous, imo_class, special_handling_notes);
    }
    
    getCargoForVoyage(voyageId) {
        return this.db.prepare(`SELECT * FROM cargo_manifest WHERE voyage_id = ?`).all(voyageId);
    }

    updateCargo(cargo_id, cargoData) {
        const { bill_of_lading_number, description, cargo_type, quantity, unit, stowage_location, is_hazardous, imo_class, special_handling_notes } = cargoData;
        const sql = `UPDATE cargo_manifest SET bill_of_lading_number = ?, description = ?, cargo_type = ?, quantity = ?, unit = ?, stowage_location = ?, is_hazardous = ?, imo_class = ?, special_handling_notes = ? WHERE cargo_id = ?`;
        return this.db.prepare(sql).run(bill_of_lading_number, description, cargo_type, quantity, unit, stowage_location, is_hazardous, imo_class, special_handling_notes, cargo_id);
    }

    deleteCargo(cargo_id) {
        const sql = `DELETE FROM cargo_manifest WHERE cargo_id = ?`;
        return this.db.prepare(sql).run(cargo_id);
    }

    // --- General Methods ---
    exportToJSON() {
        const data = {
            ships: this.getAllShips(),
            crew: this.getAllCrew(),
            voyages: this.getAllVoyages(),
            cargo_manifest: this.db.prepare('SELECT * FROM cargo_manifest').all(),
            crew_manifest: this.db.prepare('SELECT * FROM crew_manifest').all()
        };
        const jsonPath = path.join('D:', 'database', 'database_export.json');
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        console.log(`\nDatabase exported successfully to ${jsonPath}`);
    }

    close() {
        this.db.close();
        console.log('Database connection closed.');
    }
}


// --- Interactive Command-Line Interface ---

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const dbManager = new DatabaseManager();

// --- Data Seeding Function ---
function seedDatabase() {
    try {
        // Add Ships
        dbManager.addShip({ ship_name: 'MV Ganga', imo_number: '9123456', ship_type: 'Bulk Carrier', call_sign: 'AVYG', flag: 'India' });
        dbManager.addShip({ ship_name: 'FV Sagar Kanya', imo_number: '8765432', ship_type: 'Fishing Trawler', call_sign: 'AVSK', flag: 'India' });

        // Add Crew
        dbManager.addCrew({ first_name: 'Rajesh', last_name: 'Verma', date_of_birth: '1980-05-20', nationality: 'Indian', passport_number: 'R12345', seaman_book_number: 'IND101' });
        dbManager.addCrew({ first_name: 'Priya', last_name: 'Sharma', date_of_birth: '1992-11-10', nationality: 'Indian', passport_number: 'P67890', seaman_book_number: 'IND102' });
        dbManager.addCrew({ first_name: 'Suresh', last_name: 'Patel', date_of_birth: '1988-01-30', nationality: 'Indian', passport_number: 'S54321', seaman_book_number: 'IND103' });
        
        const ship1 = dbManager.getShipByIMO('9123456');
        const ship2 = dbManager.getShipByIMO('8765432');
        const crew1 = dbManager.getCrewByPassport('R12345');
        const crew2 = dbManager.getCrewByPassport('P67890');
        const crew3 = dbManager.getCrewByPassport('S54321');

        // Add Voyages
        dbManager.addVoyage({ ship_id: ship1.ship_id, voyage_number: 'GAN2501', departure_port: 'Chennai Port', destination_port: 'Singapore', departure_date: '2025-07-15 10:00:00', estimated_arrival_date: '2025-07-22 08:00:00' });
        dbManager.addVoyage({ ship_id: ship2.ship_id, voyage_number: 'SAG2501', departure_port: 'Kochi Fishing Harbour', destination_port: 'Arabian Sea', departure_date: '2025-07-18 04:00:00', estimated_arrival_date: '2025-08-01 18:00:00' });

        const voyage1 = dbManager.getVoyageByNumber('GAN2501');
        const voyage2 = dbManager.getVoyageByNumber('SAG2501');

        // Add Cargo to Voyage 1
        dbManager.addCargo({ voyage_id: voyage1.voyage_id, bill_of_lading_number: 'CHE-SIN-001', description: 'Automobile Parts', cargo_type: 'Container', quantity: 20, unit: 'TEU', stowage_location: 'Bay 10-15', is_hazardous: 0, imo_class: null, special_handling_notes: 'Handle with care.' });
        dbManager.addCargo({ voyage_id: voyage1.voyage_id, bill_of_lading_number: 'CHE-SIN-002', description: 'Textiles', cargo_type: 'Container', quantity: 15, unit: 'TEU', stowage_location: 'Bay 16-20', is_hazardous: 0, imo_class: null, special_handling_notes: null });

        // Assign Crew
        dbManager.assignCrewToVoyage({ voyage_id: voyage1.voyage_id, crew_id: crew1.crew_id, assigned_rank: 'Captain', sign_on_date: '2025-07-14' });
        dbManager.assignCrewToVoyage({ voyage_id: voyage1.voyage_id, crew_id: crew2.crew_id, assigned_rank: 'Second Officer', sign_on_date: '2025-07-14' });
        dbManager.assignCrewToVoyage({ voyage_id: voyage2.voyage_id, crew_id: crew3.crew_id, assigned_rank: 'Skipper', sign_on_date: '2025-07-17' });
        
    } catch (err) {
        // This will catch errors if data already exists, which is fine.
    }
}


// --- Ship Management Functions ---
async function manageShips() {
    while (true) {
        console.log('\n--- Ship Management ---');
        console.log('1. Add New Ship');
        console.log('2. View All Ships');
        console.log('3. Update Ship');
        console.log('4. Delete Ship');
        console.log('5. Back to Main Menu');
        const choice = await rl.question('Enter your choice: ');

        switch (choice) {
            case '1': await promptAddShip(); break;
            case '2': console.table(dbManager.getAllShips()); break;
            case '3': await promptUpdateShip(); break;
            case '4': await promptDeleteShip(); break;
            case '5': return;
            default: console.log('Invalid choice. Please try again.');
        }
    }
}

// --- Crew Management Functions ---
async function manageCrew() {
    while (true) {
        console.log('\n--- Crew Management ---');
        console.log('1. Add New Crew Member');
        console.log('2. View All Crew Members');
        console.log('3. Update Crew Member');
        console.log('4. Delete Crew Member');
        console.log('5. Back to Main Menu');
        const choice = await rl.question('Enter your choice: ');

        switch (choice) {
            case '1': await promptAddCrew(); break;
            case '2': console.table(dbManager.getAllCrew()); break;
            case '3': await promptUpdateCrew(); break;
            case '4': await promptDeleteCrew(); break;
            case '5': return;
            default: console.log('Invalid choice. Please try again.');
        }
    }
}

// --- Cargo Management Functions ---
async function manageCargo() {
    while (true) {
        console.log('\n--- Cargo Management ---');
        console.log('1. Add New Cargo to a Voyage');
        console.log('2. View Cargo for a Voyage');
        console.log('3. Update Cargo');
        console.log('4. Delete Cargo');
        console.log('5. Back to Main Menu');
        const choice = await rl.question('Enter your choice: ');

        switch (choice) {
            case '1': await promptAddCargo(); break;
            case '2': await promptViewCargo(); break;
            case '3': await promptUpdateCargo(); break;
            case '4': await promptDeleteCargo(); break;
            case '5': return;
            default: console.log('Invalid choice. Please try again.');
        }
    }
}

// --- Voyage Management Functions ---
async function manageVoyages() {
     while (true) {
        console.log('\n--- Voyage Management ---');
        console.log('1. Add New Voyage');
        console.log('2. View All Voyages');
        console.log('3. Update Voyage');
        console.log('4. Delete Voyage');
        console.log('5. Back to Main Menu');
        const choice = await rl.question('Enter your choice: ');

        switch (choice) {
            case '1': await promptAddVoyage(); break;
            case '2': console.table(dbManager.getAllVoyages()); break;
            case '3': await promptUpdateVoyage(); break;
            case '4': await promptDeleteVoyage(); break;
            case '5': return;
            default: console.log('Invalid choice. Please try again.');
        }
    }
}

// --- Helper Functions for Prompts (to be completed) ---
async function promptAddShip() { /* ... implementation ... */ }
async function promptUpdateShip() { /* ... implementation ... */ }
async function promptDeleteShip() { /* ... implementation ... */ }
async function promptAddCrew() { /* ... implementation ... */ }
async function promptUpdateCrew() { /* ... implementation ... */ }
async function promptDeleteCrew() { /* ... implementation ... */ }
async function promptAddCargo() { /* ... implementation ... */ }
async function promptViewCargo() { /* ... implementation ... */ }
async function promptUpdateCargo() { /* ... implementation ... */ }
async function promptDeleteCargo() { /* ... implementation ... */ }
async function promptAddVoyage() { /* ... implementation ... */ }
async function promptUpdateVoyage() { /* ... implementation ... */ }
async function promptDeleteVoyage() { /* ... implementation ... */ }


// --- Main Application Loop ---
async function mainMenu() {
    seedDatabase(); // Populate the database with sample data on startup
    
    while (true) {
        console.log('\n===== NAUTILUS DB MANAGER =====');
        console.log('1. Manage Ships');
        console.log('2. Manage Crew');
        console.log('3. Manage Voyages');
        console.log('4. Manage Cargo');
        console.log('5. Exit');
        const choice = await rl.question('Enter your choice: ');

        switch (choice) {
            case '1': await manageShips(); break;
            case '2': await manageCrew(); break;
            case '3': await manageVoyages(); break;
            case '4': await manageCargo(); break;
            case '5':
                dbManager.exportToJSON();
                console.log('Exiting application.');
                dbManager.close();
                rl.close();
                return;
            default:
                console.log('Invalid choice. Please try again.');
        }
    }
}

// Re-implementing prompt functions here to avoid placeholder comments
async function promptAddShip() {
    console.log('\n--- Add a New Ship ---');
    const ship_name = await rl.question('Enter Ship Name: ');
    const imo_number = await rl.question('Enter IMO Number: ');
    const ship_type = await rl.question('Enter Ship Type: ');
    const call_sign = await rl.question('Enter Call Sign: ');
    const flag = await rl.question('Enter Flag (Country): ');
    try {
        dbManager.addShip({ ship_name, imo_number, ship_type, call_sign, flag });
        console.log(`\nSUCCESS: Ship '${ship_name}' added.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptUpdateShip() {
    console.log('\n--- Update a Ship ---');
    const ships = dbManager.getAllShips();
    if (!ships.length) { console.log('No ships to update.'); return; }
    console.table(ships);
    const ship_id = await rl.question('Enter the ship_id to UPDATE: ');
    const s = ships.find(x => x.ship_id == ship_id);
    if (!s) { console.log(`\nERROR: No ship found with ID ${ship_id}.`); return; }
    console.log(`Updating Ship: ${s.ship_name}. Press Enter to keep current value.`);
    const ship_name = await rl.question(`Name (${s.ship_name}): `) || s.ship_name;
    const imo_number = await rl.question(`IMO Number (${s.imo_number}): `) || s.imo_number;
    const ship_type = await rl.question(`Type (${s.ship_type}): `) || s.ship_type;
    const call_sign = await rl.question(`Call Sign (${s.call_sign || ''}): `) || s.call_sign;
    const flag = await rl.question(`Flag (${s.flag}): `) || s.flag;
    try {
        dbManager.updateShip(parseInt(ship_id), { ship_name, imo_number, ship_type, call_sign, flag });
        console.log(`\nSUCCESS: Ship with ID ${ship_id} updated.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptDeleteShip() {
    console.log('\n--- Delete a Ship ---');
    const ships = dbManager.getAllShips();
    if (!ships.length) { console.log('No ships to delete.'); return; }
    console.table(ships);
    const ship_id = await rl.question('Enter the ship_id to DELETE: ');
    try {
        const result = dbManager.deleteShip(parseInt(ship_id));
        if (result.changes > 0) console.log(`\nSUCCESS: Ship with ID ${ship_id} deleted.`);
        else console.log(`\nINFO: No ship found with ID ${ship_id}.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptAddCrew() {
    console.log('\n--- Add a New Crew Member ---');
    const first_name = await rl.question('Enter First Name: ');
    const last_name = await rl.question('Enter Last Name: ');
    const date_of_birth = await rl.question('Enter DOB (YYYY-MM-DD): ');
    const nationality = await rl.question('Enter Nationality: ');
    const passport_number = await rl.question('Enter Passport Number: ');
    const seaman_book_number = await rl.question('Enter Seaman Book Number: ');
    try {
        dbManager.addCrew({ first_name, last_name, date_of_birth, nationality, passport_number, seaman_book_number });
        console.log(`\nSUCCESS: Crew member '${first_name} ${last_name}' added.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptUpdateCrew() {
    console.log('\n--- Update a Crew Member ---');
    const crew = dbManager.getAllCrew();
    if (!crew.length) { console.log('No crew to update.'); return; }
    console.table(crew);
    const crew_id = await rl.question('Enter the crew_id to UPDATE: ');
    const c = crew.find(x => x.crew_id == crew_id);
    if (!c) { console.log(`\nERROR: No crew member found with ID ${crew_id}.`); return; }
    console.log(`Updating: ${c.first_name} ${c.last_name}. Press Enter to keep.`);
    const first_name = await rl.question(`First Name (${c.first_name}): `) || c.first_name;
    const last_name = await rl.question(`Last Name (${c.last_name}): `) || c.last_name;
    const date_of_birth = await rl.question(`DOB (${c.date_of_birth}): `) || c.date_of_birth;
    const nationality = await rl.question(`Nationality (${c.nationality}): `) || c.nationality;
    const passport_number = await rl.question(`Passport No. (${c.passport_number}): `) || c.passport_number;
    const seaman_book_number = await rl.question(`Seaman Book No. (${c.seaman_book_number}): `) || c.seaman_book_number;
    try {
        dbManager.updateCrew(parseInt(crew_id), { first_name, last_name, date_of_birth, nationality, passport_number, seaman_book_number });
        console.log(`\nSUCCESS: Crew member with ID ${crew_id} updated.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptDeleteCrew() {
    console.log('\n--- Delete a Crew Member ---');
    const crew = dbManager.getAllCrew();
    if (!crew.length) { console.log('No crew to delete.'); return; }
    console.table(crew);
    const crew_id = await rl.question('Enter the crew_id to DELETE: ');
    try {
        const result = dbManager.deleteCrew(parseInt(crew_id));
        if (result.changes > 0) console.log(`\nSUCCESS: Crew member with ID ${crew_id} deleted.`);
        else console.log(`\nINFO: No crew member found with ID ${crew_id}.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptAddCargo() {
    console.log('\n--- Add New Cargo ---');
    const voyages = dbManager.getAllVoyages();
    if (!voyages.length) { console.log('No voyages exist. Create one first.'); return; }
    console.table(voyages);
    const voyage_id = await rl.question('Enter voyage_id for the cargo: ');
    if (!voyages.some(v => v.voyage_id == voyage_id)) { console.log(`\nERROR: Voyage ID ${voyage_id} not found.`); return; }
    const bill_of_lading_number = await rl.question('Bill of Lading Number: ');
    const description = await rl.question('Description: ');
    const cargo_type = await rl.question('Type (Bulk, Container): ');
    const quantity = await rl.question('Quantity: ');
    const unit = await rl.question('Unit (Metric Tons, TEU): ');
    const stowage_location = await rl.question('Stowage Location: ');
    const is_hazardous = (await rl.question('Hazardous? (yes/no): ')).toLowerCase() === 'yes' ? 1 : 0;
    const imo_class = is_hazardous ? await rl.question('IMO Class: ') : null;
    const special_handling_notes = await rl.question('Special Handling Notes: ');
    try {
        dbManager.addCargo({ voyage_id: parseInt(voyage_id), bill_of_lading_number, description, cargo_type, quantity: parseFloat(quantity), unit, stowage_location, is_hazardous, imo_class, special_handling_notes });
        console.log(`\nSUCCESS: Cargo added to voyage ID ${voyage_id}.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptViewCargo() {
    console.log('\n--- View Cargo for a Voyage ---');
    const voyages = dbManager.getAllVoyages();
    if (!voyages.length) { console.log('No voyages exist.'); return; }
    console.table(voyages);
    const voyage_id = await rl.question('Enter voyage_id to view cargo for: ');
    const cargoList = dbManager.getCargoForVoyage(parseInt(voyage_id));
    if (!cargoList.length) console.log(`No cargo for voyage ID ${voyage_id}.`);
    else console.table(cargoList);
}
async function promptUpdateCargo() {
    console.log('\n--- Update Cargo ---');
    const voyages = dbManager.getAllVoyages();
    if (!voyages.length) { console.log('No voyages exist.'); return; }
    console.table(voyages);
    const voyage_id = await rl.question('Enter voyage_id to see cargo: ');
    const cargoList = dbManager.getCargoForVoyage(parseInt(voyage_id));
    if (!cargoList.length) { console.log(`No cargo to update for voyage ID ${voyage_id}.`); return; }
    console.table(cargoList);
    const cargo_id = await rl.question('Enter the cargo_id to UPDATE: ');
    const c = cargoList.find(x => x.cargo_id == cargo_id);
    if (!c) { console.log(`\nERROR: No cargo found with ID ${cargo_id}.`); return; }
    console.log(`Updating Cargo: ${c.description}. Press Enter to keep.`);
    const bill_of_lading_number = await rl.question(`B/L No. (${c.bill_of_lading_number}): `) || c.bill_of_lading_number;
    const description = await rl.question(`Description (${c.description}): `) || c.description;
    const cargo_type = await rl.question(`Type (${c.cargo_type}): `) || c.cargo_type;
    const quantity = await rl.question(`Quantity (${c.quantity}): `) || c.quantity;
    const unit = await rl.question(`Unit (${c.unit}): `) || c.unit;
    const stowage_location = await rl.question(`Stowage (${c.stowage_location}): `) || c.stowage_location;
    const is_hazardous = (await rl.question(`Hazardous? (${c.is_hazardous ? 'yes' : 'no'}): `) || (c.is_hazardous ? 'yes' : 'no')).toLowerCase() === 'yes' ? 1 : 0;
    const imo_class = is_hazardous ? await rl.question(`IMO Class (${c.imo_class || ''}): `) || c.imo_class : null;
    const special_handling_notes = await rl.question(`Notes (${c.special_handling_notes || ''}): `) || c.special_handling_notes;
    try {
        dbManager.updateCargo(parseInt(cargo_id), { bill_of_lading_number, description, cargo_type, quantity: parseFloat(quantity), unit, stowage_location, is_hazardous, imo_class, special_handling_notes });
        console.log(`\nSUCCESS: Cargo with ID ${cargo_id} updated.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptDeleteCargo() {
    console.log('\n--- Delete Cargo ---');
    const voyages = dbManager.getAllVoyages();
    if (!voyages.length) { console.log('No voyages exist.'); return; }
    console.table(voyages);
    const voyage_id = await rl.question('Enter voyage_id to see cargo: ');
    const cargoList = dbManager.getCargoForVoyage(parseInt(voyage_id));
    if (!cargoList.length) { console.log(`No cargo to delete for voyage ID ${voyage_id}.`); return; }
    console.table(cargoList);
    const cargo_id = await rl.question('Enter the cargo_id to DELETE: ');
    try {
        const result = dbManager.deleteCargo(parseInt(cargo_id));
        if (result.changes > 0) console.log(`\nSUCCESS: Cargo with ID ${cargo_id} deleted.`);
        else console.log(`\nINFO: No cargo found with ID ${cargo_id}.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptAddVoyage() {
    console.log('\n--- Add New Voyage ---');
    const ships = dbManager.getAllShips();
    if (!ships.length) { console.log('No ships exist. Create one first.'); return; }
    console.table(ships);
    const ship_id = await rl.question('Enter ship_id for the voyage: ');
    if (!ships.some(s => s.ship_id == ship_id)) { console.log(`\nERROR: Ship ID ${ship_id} not found.`); return; }
    const voyage_number = await rl.question('Voyage Number: ');
    const departure_port = await rl.question('Departure Port: ');
    const destination_port = await rl.question('Destination Port: ');
    const departure_date = await rl.question('Departure Date (YYYY-MM-DD HH:MM:SS): ');
    const estimated_arrival_date = await rl.question('ETA (YYYY-MM-DD HH:MM:SS): ');
    try {
        dbManager.addVoyage({ ship_id: parseInt(ship_id), voyage_number, departure_port, destination_port, departure_date, estimated_arrival_date });
        console.log(`\nSUCCESS: Voyage ${voyage_number} added.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptUpdateVoyage() {
    console.log('\n--- Update a Voyage ---');
    const voyages = dbManager.getAllVoyages();
    if (!voyages.length) { console.log('No voyages to update.'); return; }
    console.table(voyages);
    const voyage_id = await rl.question('Enter the voyage_id to UPDATE: ');
    const v = voyages.find(x => x.voyage_id == voyage_id);
    if (!v) { console.log(`\nERROR: No voyage found with ID ${voyage_id}.`); return; }
    console.log(`Updating Voyage: ${v.voyage_number}. Press Enter to keep.`);
    const voyage_number = await rl.question(`Voyage No. (${v.voyage_number}): `) || v.voyage_number;
    const departure_port = await rl.question(`Departure Port (${v.departure_port}): `) || v.departure_port;
    const destination_port = await rl.question(`Destination Port (${v.destination_port}): `) || v.destination_port;
    const departure_date = await rl.question(`Departure Date (${v.departure_date}): `) || v.departure_date;
    const estimated_arrival_date = await rl.question(`ETA (${v.estimated_arrival_date}): `) || v.estimated_arrival_date;
    const actual_arrival_date = await rl.question(`ATA (${v.actual_arrival_date || ''}): `) || v.actual_arrival_date;
    const status = await rl.question(`Status (${v.status}): `) || v.status;
    try {
        dbManager.updateVoyage(parseInt(voyage_id), { ...v, voyage_number, departure_port, destination_port, departure_date, estimated_arrival_date, actual_arrival_date, status });
        console.log(`\nSUCCESS: Voyage with ID ${voyage_id} updated.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}
async function promptDeleteVoyage() {
    console.log('\n--- Delete a Voyage ---');
    const voyages = dbManager.getAllVoyages();
    if (!voyages.length) { console.log('No voyages to delete.'); return; }
    console.table(voyages);
    const voyage_id = await rl.question('Enter the voyage_id to DELETE: ');
    try {
        const result = dbManager.deleteVoyage(parseInt(voyage_id));
        if (result.changes > 0) console.log(`\nSUCCESS: Voyage with ID ${voyage_id} deleted.`);
        else console.log(`\nINFO: No voyage found with ID ${voyage_id}.`);
    } catch (err) { console.error(`\nERROR: ${err.message}`); }
}

// Start the application
mainMenu();
