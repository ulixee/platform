"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ChannelHoldsTable {
    constructor(db) {
        this.db = db;
        db.exec(`CREATE TABLE IF NOT EXISTS ChannelHolds (
      channelHoldId TEXT NOT NULL PRIMARY KEY,
      organizationId INTEGER NOT NULL,
      createdByIdentity TEXT NOT NULL,
      domain TEXT,
      heldMilligons INTEGER NOT NULL,
      settledMilligons INTEGER,
      settlementDate DATETIME,
      created DATETIME NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organizations(id)
    );`);
        db.exec(`CREATE INDEX IF NOT EXISTS ChannelHolds_organizationId ON ChannelHolds (organizationId);`);
        this.insertQuery = db.prepare(`INSERT INTO ChannelHolds (channelHoldId, organizationId, createdByIdentity, domain, heldMilligons, created) 
            VALUES (:channelHoldId, :organizationId, :createdByIdentity, :domain, :heldMilligons, :created)`);
        this.updateSettlementQuery = db.prepare(`UPDATE ChannelHolds SET settledMilligons = :settledMilligons, settlementDate = :date WHERE channelHoldId = :channelHoldId 
            RETURNING organizationId, heldMilligons`);
    }
    create(channelHold) {
        channelHold.created = Date.now();
        this.insertQuery.run(channelHold);
    }
    updateSettlementReturningChange(channelHoldId, settledMilligons, settlementDate) {
        const { organizationId, heldMilligons } = this.updateSettlementQuery.get({
            channelHoldId,
            settledMilligons,
            date: settlementDate,
        });
        const change = heldMilligons - settledMilligons;
        return [organizationId, heldMilligons, change];
    }
    /// ADMIN APIS
    count() {
        return (this.db
            .prepare(`SELECT COUNT(*) FROM ChannelHolds`)
            .safeIntegers(false)
            .pluck()
            .get() ?? 0);
    }
    countOpen() {
        return (this.db
            .prepare(`SELECT COUNT(*) FROM ChannelHolds WHERE settlementDate IS NULL`)
            .safeIntegers(false)
            .pluck()
            .get() ?? 0);
    }
    pendingBalance() {
        return (this.db
            .prepare(`SELECT SUM(heldMilligons) FROM ChannelHolds WHERE settlementDate IS NULL`)
            .pluck()
            .get() ?? 0n);
    }
}
exports.default = ChannelHoldsTable;
//# sourceMappingURL=ChannelHoldsTable.js.map