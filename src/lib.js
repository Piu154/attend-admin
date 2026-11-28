export const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const niceDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// [label, tone]
export const STATUS = { approved: ['Active', 'ok'], pending: ['Pending', 'warn'], suspended: ['Suspended', 'danger'], rejected: ['Rejected', 'muted'] };
export const PAY = { paid: ['Paid', 'ok'], due: ['Payment due', 'warn'], overdue: ['Overdue', 'danger'] };

// the plan menu for each venue type: [value, label, detail]
export const PLANS = {
  RESTAURANT: [
    ['STANDARD_3K', 'Standard', '₹3,000 / month · 1 branch · 25 tables'],
    ['PRO_5K', 'Pro / in-mall outlet', '₹5,000 / month · 1 branch · 40 tables'],
  ],
  MALL_FOOD_COURT: [['MALL_15K', 'Mall food court', '₹15,000 / month · 1 food court · 150 tables']],
};