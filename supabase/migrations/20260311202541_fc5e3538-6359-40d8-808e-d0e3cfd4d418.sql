
-- Delete duplicate transactions, keeping only the oldest per (user_id, listing_id) and (user_id, buyer_id)
DELETE FROM transaction_suggested_tasks
WHERE transaction_id IN (
  SELECT t.id FROM transactions t
  WHERE t.listing_id IS NOT NULL
    AND t.id != (
      SELECT t2.id FROM transactions t2
      WHERE t2.user_id = t.user_id AND t2.listing_id = t.listing_id
      ORDER BY t2.created_at ASC LIMIT 1
    )
);

DELETE FROM transaction_state_history
WHERE transaction_id IN (
  SELECT t.id FROM transactions t
  WHERE t.listing_id IS NOT NULL
    AND t.id != (
      SELECT t2.id FROM transactions t2
      WHERE t2.user_id = t.user_id AND t2.listing_id = t.listing_id
      ORDER BY t2.created_at ASC LIMIT 1
    )
);

DELETE FROM transactions t
WHERE t.listing_id IS NOT NULL
  AND t.id != (
    SELECT t2.id FROM transactions t2
    WHERE t2.user_id = t.user_id AND t2.listing_id = t.listing_id
    ORDER BY t2.created_at ASC LIMIT 1
  );

-- Same for buyer duplicates
DELETE FROM transaction_suggested_tasks
WHERE transaction_id IN (
  SELECT t.id FROM transactions t
  WHERE t.buyer_id IS NOT NULL
    AND t.id != (
      SELECT t2.id FROM transactions t2
      WHERE t2.user_id = t.user_id AND t2.buyer_id = t.buyer_id
      ORDER BY t2.created_at ASC LIMIT 1
    )
);

DELETE FROM transaction_state_history
WHERE transaction_id IN (
  SELECT t.id FROM transactions t
  WHERE t.buyer_id IS NOT NULL
    AND t.id != (
      SELECT t2.id FROM transactions t2
      WHERE t2.user_id = t.user_id AND t2.buyer_id = t.buyer_id
      ORDER BY t2.created_at ASC LIMIT 1
    )
);

DELETE FROM transactions t
WHERE t.buyer_id IS NOT NULL
  AND t.id != (
    SELECT t2.id FROM transactions t2
    WHERE t2.user_id = t.user_id AND t2.buyer_id = t.buyer_id
    ORDER BY t2.created_at ASC LIMIT 1
  );

-- Add unique constraints to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_user_listing ON transactions (user_id, listing_id) WHERE listing_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_user_buyer ON transactions (user_id, buyer_id) WHERE buyer_id IS NOT NULL;
