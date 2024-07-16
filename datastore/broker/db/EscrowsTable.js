"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EscrowsTable {
    constructor(db) {
        this.db = db;
        db.exec(`CREATE TABLE IF NOT EXISTS Escrows (
      escrowId TEXT NOT NULL PRIMARY KEY,
      organizationId INTEGER NOT NULL,
      createdByIdentity TEXT NOT NULL,
      dataDomain TEXT,
      heldMilligons INTEGER NOT NULL,
      settledMilligons INTEGER,
      settlementDate DATETIME,
      created DATETIME NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organizations(id)
    );`);
        db.exec(`CREATE INDEX IF NOT EXISTS Escrows_organizationId ON Escrows (organizationId);`);
        this.insertQuery = db.prepare(`INSERT INTO Escrows (escrowId, organizationId, createdByIdentity, dataDomain, heldMilligons, created) 
            VALUES (:escrowId, :organizationId, :createdByIdentity, :dataDomain, :heldMilligons, :created)`);
        this.updateSettlementQuery = db.prepare(`UPDATE Escrows SET settledMilligons = :settledMilligons, settlementDate = :date WHERE escrowId = :escrowId 
            RETURNING organizationId, heldMilligons`);
    }
    create(escrow) {
        escrow.created = Date.now();
        this.insertQuery.run(escrow);
    }
    updateSettlementReturningChange(escrowId, settledMilligons, settlementDate) {
        const { organizationId, heldMilligons } = this.updateSettlementQuery.get({
            escrowId,
            settledMilligons,
            date: settlementDate,
        });
        const change = heldMilligons - settledMilligons;
        return [organizationId, heldMilligons, change];
    }
    /// ADMIN APIS
    count() {
        return (this.db
            .prepare(`SELECT COUNT(*) FROM Escrows`)
            .safeIntegers(false)
            .pluck()
            .get() ?? 0);
    }
    countOpen() {
        return (this.db
            .prepare(`SELECT COUNT(*) FROM Escrows WHERE settlementDate IS NULL`)
            .safeIntegers(false)
            .pluck()
            .get() ?? 0);
    }
    pendingBalance() {
        return (this.db
            .prepare(`SELECT SUM(heldMilligons) FROM Escrows WHERE settlementDate IS NULL`)
            .pluck()
            .get() ?? 0n);
    }
}
exports.default = EscrowsTable;
//# sourceMappingURL=EscrowsTable.js.map