class AverageCalculator {
  constructor() {
    this.rows = [];
    this.currentAverage = null;
    this.lastUpdatedAt = null;
  }

  init(rows = []) {
    this.rows = this.normalizeRows(rows);
    this.recalculate();
  }

  normalizeRows(rows) {
    return rows
      .filter((row) => row && row.date && row.settlement != null)
      .map((row) => ({
        date: row.date,
        settlement: Number(row.settlement),
        symbolCode: row.symbolCode || null,
        updateDate: row.updateDate || null,
        recordedAt: row.recordedAt || null,
      }))
      .filter((row) => Number.isFinite(row.settlement))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  recalculate() {
    const lastFive = this.rows.slice(-5);

    if (!lastFive.length) {
      this.currentAverage = null;
      this.lastUpdatedAt = Date.now();
      return;
    }

    const total = lastFive.reduce((sum, row) => sum + row.settlement, 0);
    this.currentAverage = total / lastFive.length;
    this.lastUpdatedAt = Date.now();
  }

  onNewSettlementRecord(newRow) {
    if (!newRow || !newRow.date || newRow.settlement == null) {
      return;
    }

    const normalized = {
      date: newRow.date,
      settlement: Number(newRow.settlement),
      symbolCode: newRow.symbolCode || null,
      updateDate: newRow.updateDate || null,
      recordedAt: newRow.recordedAt || null,
    };

    if (!Number.isFinite(normalized.settlement)) {
      return;
    }

    const existingIndex = this.rows.findIndex((row) => row.date === normalized.date);

    if (existingIndex >= 0) {
      this.rows[existingIndex] = normalized;
    } else {
      this.rows.push(normalized);
    }

    this.rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.recalculate();
  }

  getCurrentAverage() {
    return this.currentAverage;
  }

  getLastFiveRows() {
    return this.rows.slice(-5);
  }

  getSummary() {
    return {
      average: this.currentAverage,
      count: this.rows.slice(-5).length,
      rows: this.rows.slice(-5),
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }
}

module.exports = {
  AverageCalculator,
};