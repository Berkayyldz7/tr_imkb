class SettlementAverage {
  constructor() {
    this.rows = [];
    this.avg5 = null;
  }

  init(rows = []) {
    this.rows = rows;
    this.recalculate();
  }

  update(rows = []) {
    this.rows = rows;
    this.recalculate();
  }

  getAverage5() {
    return this.avg5;
  }

  recalculate() {
    const validRows = this.rows
      .filter((row) => row && row.date && row.settlement != null)
      .map((row) => ({
        date: row.date,
        settlement: Number(row.settlement),
      }))
      .filter((row) => Number.isFinite(row.settlement))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-5);

    if (!validRows.length) {
      this.avg5 = null;
      return;
    }

    const total = validRows.reduce((sum, row) => sum + row.settlement, 0);
    this.avg5 = total / validRows.length;
  }
}

module.exports = {
  SettlementAverage,
};