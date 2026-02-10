

## Expand Personal Performance Stats with Pipeline Metrics

### Problem
The "Total Sales Volume" and "Total Commission" cards only count **closed** deals. Until an agent closes a deal, these show $0 -- giving no visibility into pipeline value.

### Solution
Add two new projected/pipeline metrics alongside the existing closed-deal metrics, expanding the stats row from 4 cards to 6. This gives agents both actual (closed) and projected (pipeline) performance visibility.

### New Stats Layout (6 cards, 3 columns x 2 rows)

| Row 1 | | |
|---|---|---|
| Active Listings | Active Buyers | Closed Sales Volume |
| Row 2 | | |
| Projected Sales Volume | Projected Commission | Closed Commission |

**Metric definitions:**
- **Closed Sales Volume** (existing "Total Sales Volume"): Sum of `price` from closed listings only
- **Closed Commission** (existing "Total Commission"): Sum of `agent_commission` from all listings + buyer 50/50 split commissions
- **Projected Sales Volume** (new): Sum of `price` from Active + Pending listings (pipeline deals not yet closed)
- **Projected Commission** (new): Sum of `agent_commission` from Active + Pending listings + buyer commissions from Active buyers (using pre_approved_amount and commission_percentage with the 50/50 split)

### Technical Changes

**1. `src/hooks/usePersonalData.ts`**
- Add 2 new fields to `PersonalStats` interface: `projectedSalesVolume` and `projectedCommission`
- `projectedSalesVolume` = sum of `price` from Active + Pending listings
- `projectedCommission` = sum of `agent_commission` from Active + Pending listings + buyer commissions from Active buyers (using the existing 50/50 split formula)

**2. `src/components/team/TeamStatsOverview.tsx`**
- Accept the expanded stats (the component already receives the full stats object)
- Change the grid from 4 columns to 3 columns x 2 rows (`grid-cols-3`)
- Add two new cards for Projected Sales Volume and Projected Commission
- Rename existing cards: "Total Sales Volume" becomes "Closed Sales Volume", "Total Commission" becomes "Closed Commission"

**3. `src/hooks/useTeamData.ts`** (minor)
- Add the two new fields to the `TeamStats` interface so TypeScript stays happy (TeamStatsOverview accepts `TeamStats` type). Default them to 0 since the team section uses different data.

No database changes needed -- all the data (price, agent_commission, pre_approved_amount, commission_percentage, status) already exists in the listings and buyers tables.

