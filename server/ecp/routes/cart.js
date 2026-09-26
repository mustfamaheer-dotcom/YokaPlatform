const router = require('express').Router();
const crypto = require('crypto');
const { query } = require('../../shared/db');
const { getReservedQuantity } = require('../../shared/inventoryReservation');

const ONLINE_BRANCH_ID = parseInt(process.env.ONLINE_BRANCH_ID || '1', 10);

/**
 * Helper to retrieve or create shopping cart for session / customer
 */
async function getOrCreateCart(req) {
  const customerId = req.user?.id || null;
  const guestToken = req.headers['x-guest-cart-token'] || req.cookies?.guest_cart_token || null;

  let cart = null;

  if (customerId) {
    [cart] = await query(
      `SELECT * FROM ecp_shopping_carts WHERE customer_id = $1 ORDER BY id DESC LIMIT 1`,
      [customerId]
    );
  } else if (guestToken) {
    [cart] = await query(
      `SELECT * FROM ecp_shopping_carts WHERE session_id = $1 ORDER BY id DESC LIMIT 1`,
      [guestToken]
    );
  }

  if (!cart) {
    const sessionToken = guestToken || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const [created] = await query(
      `INSERT INTO ecp_shopping_carts (
        customer_id, session_id, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *`,
      [customerId, sessionToken, expiresAt]
    );
    cart = created;
  }

  return cart;
}

/**
 * GET /api/ecp/cart
 * Get current shopping cart items with pricing and inventory status
 */
router.get('/', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req);

    const items = await query(
      `SELECT ci.id AS item_id,
              ci.cart_id,
              ci.product_id,
              ci.variant_id,
              ci.quantity,
              ci.unit_price,
              p.product_name,
              p.product_code,
              p.slug,
              p.featured_image,
              pv.variant_sku,
              pv.color,
              pv.size,
              COALESCE(ib_var.available_qty, ib_base.available_qty, 0) AS stock_qty
       FROM ecp_cart_items ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_variants pv ON pv.id = ci.variant_id
       LEFT JOIN inventory_balances ib_var ON ib_var.product_id = ci.product_id
                                          AND ib_var.variant_id = ci.variant_id
                                          AND ib_var.branch_id = $2
       LEFT JOIN inventory_balances ib_base ON ib_base.product_id = ci.product_id
                                           AND ib_base.variant_id IS NULL
                                           AND ib_base.branch_id = $2
       WHERE ci.cart_id = $1
       ORDER BY ci.id ASC`,
      [cart.id, ONLINE_BRANCH_ID]
    );

    let subtotal = 0;
    const formattedItems = items.map((it) => {
      const price = parseFloat(it.unit_price) || 0;
      const qty = parseInt(it.quantity, 10);
      const lineTotal = price * qty;
      subtotal += lineTotal;

      return {
        ...it,
        unit_price: price,
        line_total: lineTotal,
        display_name: it.color || it.size
          ? `${it.product_name} (${[it.color, it.size].filter(Boolean).join(' / ')})`
          : it.product_name,
        is_in_stock: parseInt(it.stock_qty, 10) >= qty
      };
    });

    return res.json({
      success: true,
      data: {
        cart_id: cart.id,
        session_id: cart.session_id,
        items: formattedItems,
        items_count: formattedItems.reduce((acc, it) => acc + it.quantity, 0),
        subtotal,
        coupon_code: cart.coupon_code || null
      }
    });
  } catch (err) {
    console.error('ECP get cart error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ecp/cart/items
 * Add an item or increment quantity in the cart
 */
router.post('/items', async (req, res) => {
  try {
    const { product_id, variant_id = null, quantity = 1 } = req.body;

    const addQty = Math.max(1, parseInt(quantity, 10) || 1);
    const cart = await getOrCreateCart(req);

    // Fetch product details & selling price
    const [prod] = await query(
      `SELECT id, product_name, cost_price, selling_price, sale_price, status
       FROM products
       WHERE id = $1 AND status = 'active'`,
      [product_id]
    );

    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }

    let unitPrice = parseFloat(prod.sale_price || prod.selling_price) || 0;

    // Check variant price modifier if applicable
    if (variant_id) {
      const [v] = await query(
        `SELECT price_modifier FROM product_variants WHERE id = $1 AND product_id = $2`,
        [variant_id, product_id]
      );
      if (v) {
        unitPrice += parseFloat(v.price_modifier || 0);
      }
    }

    // Verify stock availability
    let availableStock = 0;
    if (variant_id) {
      const [vBal] = await query(
        `SELECT available_qty FROM inventory_balances
         WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3`,
        [ONLINE_BRANCH_ID, product_id, variant_id]
      );
      if (vBal && parseInt(vBal.available_qty, 10) > 0) {
        availableStock = parseInt(vBal.available_qty, 10);
      } else {
        const [bBal] = await query(
          `SELECT available_qty FROM inventory_balances
           WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL`,
          [ONLINE_BRANCH_ID, product_id]
        );
        availableStock = bBal ? parseInt(bBal.available_qty, 10) : 0;
      }
    } else {
      const [bBal] = await query(
        `SELECT available_qty FROM inventory_balances
         WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL`,
        [ONLINE_BRANCH_ID, product_id]
      );
      availableStock = bBal ? parseInt(bBal.available_qty, 10) : 0;
    }

    // Check current quantity in cart
    const [existing] = await query(
      `SELECT id, quantity FROM ecp_cart_items
       WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR ($3 IS NULL AND variant_id IS NULL))`,
      [cart.id, product_id, variant_id]
    );

    const currentQtyInCart = existing ? parseInt(existing.quantity, 10) : 0;
    const targetQty = currentQtyInCart + addQty;

    if (availableStock < targetQty) {
      return res.status(400).json({
        success: false,
        message: `عذراً، الرصيد المتاح من هذا الصنف هو ${availableStock} قطعة فقط.`
      });
    }

    if (existing) {
      await query(
        `UPDATE ecp_cart_items
         SET quantity = $1, unit_price = $2, updated_at = NOW()
         WHERE id = $3`,
        [targetQty, unitPrice, existing.id]
      );
    } else {
      await query(
        `INSERT INTO ecp_cart_items (
          cart_id, product_id, variant_id, quantity, unit_price, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [cart.id, product_id, variant_id, addQty, unitPrice]
      );
    }

    return res.json({
      success: true,
      message: 'تمت إضافة المنتج إلى سلة التسوق بنجاح',
      cart_token: cart.session_id
    });
  } catch (err) {
    console.error('ECP add cart item error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/ecp/cart/items/:id
 * Update quantity of a specific item in cart
 */
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const newQty = parseInt(quantity, 10);

    const [item] = await query(`SELECT * FROM ecp_cart_items WHERE id = $1`, [id]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    if (newQty <= 0) {
      await query(`DELETE FROM ecp_cart_items WHERE id = $1`, [id]);
      return res.json({ success: true, message: 'تم حذف الصنف من السلة' });
    }

    // Verify stock
    let availableStock = 0;
    if (item.variant_id) {
      const [vBal] = await query(
        `SELECT available_qty FROM inventory_balances
         WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3`,
        [ONLINE_BRANCH_ID, item.product_id, item.variant_id]
      );
      if (vBal && parseInt(vBal.available_qty, 10) > 0) {
        availableStock = parseInt(vBal.available_qty, 10);
      } else {
        const [bBal] = await query(
          `SELECT available_qty FROM inventory_balances
           WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL`,
          [ONLINE_BRANCH_ID, item.product_id]
        );
        availableStock = bBal ? parseInt(bBal.available_qty, 10) : 0;
      }
    } else {
      const [bBal] = await query(
        `SELECT available_qty FROM inventory_balances
         WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL`,
        [ONLINE_BRANCH_ID, item.product_id]
      );
      availableStock = bBal ? parseInt(bBal.available_qty, 10) : 0;
    }

    if (availableStock < newQty) {
      return res.status(400).json({
        success: false,
        message: `الكمية المتاحة في المخزن (${availableStock}) فقط.`
      });
    }

    await query(
      `UPDATE ecp_cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2`,
      [newQty, id]
    );

    return res.json({ success: true, message: 'تم تحديث الكمية بنجاح' });
  } catch (err) {
    console.error('ECP update cart item error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/ecp/cart/items/:id
 * Remove item from cart
 */
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM ecp_cart_items WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'تم حذف الصنف من السلة' });
  } catch (err) {
    console.error('ECP delete cart item error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/ecp/cart
 * Empty all items from cart
 */
router.delete('/', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req);
    await query(`DELETE FROM ecp_cart_items WHERE cart_id = $1`, [cart.id]);
    return res.json({ success: true, message: 'تم تفريغ السلة بنجاح' });
  } catch (err) {
    console.error('ECP clear cart error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
