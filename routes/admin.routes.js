const router = require("express").Router();

const db = require("../config/db");

const {
  verifyAdmin
} = require("../middleware/auth.middleware");


/* =========================================================
   ADMIN IDENTITY
   GET /api/admin/me
========================================================= */

router.get(
  "/me",
  verifyAdmin,
  (req, res) => {

    res.json({
      success: true,
      authenticated: true,
      admin: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });

  }
);


/* =========================================================
   DASHBOARD STATISTICS
   GET /api/admin/dashboard
========================================================= */

router.get(
  "/dashboard",
  verifyAdmin,
  (req, res) => {

    const stats = {};

    db.query(
      "SELECT COUNT(*) AS count FROM users",
      (err, usersResult) => {

        if (err) {
          console.error(err);

          return res.status(500).json({
            success: false,
            message: "Failed to load users"
          });
        }

        stats.users =
          usersResult[0].count;


        db.query(
          "SELECT COUNT(*) AS count FROM users WHERE role='vendor'",
          (err, vendorsResult) => {

            if (err) {
              return res.status(500).json({
                success: false,
                message: "Failed to load vendors"
              });
            }

            stats.vendors =
              vendorsResult[0].count;


            db.query(
              "SELECT COUNT(*) AS count FROM products",
              (err, productsResult) => {

                if (err) {
                  return res.status(500).json({
                    success: false,
                    message: "Failed to load products"
                  });
                }

                stats.products =
                  productsResult[0].count;


                db.query(
                  "SELECT COUNT(*) AS count FROM orders",
                  (err, ordersResult) => {

                    if (err) {
                      return res.status(500).json({
                        success: false,
                        message: "Failed to load orders"
                      });
                    }

                    stats.orders =
                      ordersResult[0].count;


                    db.query(
                      `
                      SELECT
                        COALESCE(
                          SUM(total_pi),
                          0
                        ) AS total
                      FROM orders
                      WHERE status IN (
                        'paid',
                        'shipped',
                        'completed'
                      )
                      `,
                      (err, salesResult) => {

                        if (err) {
                          return res.status(500).json({
                            success: false,
                            message: "Failed to load sales"
                          });
                        }

                        stats.sales =
                          Number(
                            salesResult[0].total || 0
                          );

                        res.json({
                          success: true,
                          stats
                        });

                      }
                    );

                  }
                );

              }
            );

          }
        );

      }
    );

  }
);


/* =========================================================
   PENDING PRODUCTS
========================================================= */

router.get(
  "/products/pending",
  verifyAdmin,
  (req, res) => {

    db.query(
      `
      SELECT
        p.*,
        u.name AS vendor_name,
        u.email AS vendor_email
      FROM products p
      LEFT JOIN users u
        ON p.vendor_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
      `,
      (err, result) => {

        if (err) {

          console.error(err);

          return res.status(500).json({
            success: false,
            message: "Failed to load pending products"
          });

        }

        res.json(
          result || []
        );

      }
    );

  }
);


/* =========================================================
   PENDING VENDORS
========================================================= */

router.get(
  "/vendors/pending",
  verifyAdmin,
  (req, res) => {

    db.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        created_at
      FROM users
      WHERE role = 'vendor'
      AND status = 'pending'
      ORDER BY created_at DESC
      `,
      (err, result) => {

        if (err) {

          console.error(err);

          return res.status(500).json({
            success: false,
            message: "Failed to load pending vendors"
          });

        }

        res.json(
          result || []
        );

      }
    );

  }
);


/* =========================================================
   APPROVE PRODUCT
========================================================= */

router.post(
  "/products/approve/:id",
  verifyAdmin,
  (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    db.query(
      `
      SELECT
        id,
        vendor_id
      FROM products
      WHERE id = ?
      AND status = 'pending'
      `,
      [id],
      (err, products) => {

        if (err) {
          return res.status(500).json({
            success: false,
            message: "Database error"
          });
        }

        if (!products.length) {
          return res.status(404).json({
            success: false,
            message: "Pending product not found"
          });
        }

        const vendorId =
          products[0].vendor_id;


        db.query(
          `
          UPDATE products
          SET status = 'approved'
          WHERE id = ?
          `,
          [id],
          (updateErr) => {

            if (updateErr) {
              return res.status(500).json({
                success: false,
                message: "Product approval failed"
              });
            }


            db.query(
              `
              INSERT INTO notifications
              (user_id, message, type)
              VALUES (?, ?, ?)
              `,
              [
                vendorId,
                "Your product has been approved ✅",
                "product"
              ]
            );


            res.json({
              success: true,
              message: "Product approved"
            });

          }
        );

      }
    );

  }
);


/* =========================================================
   REJECT PRODUCT
========================================================= */

router.post(
  "/products/reject/:id",
  verifyAdmin,
  (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    db.query(
      `
      SELECT
        id,
        vendor_id
      FROM products
      WHERE id = ?
      AND status = 'pending'
      `,
      [id],
      (err, products) => {

        if (err) {
          return res.status(500).json({
            success: false,
            message: "Database error"
          });
        }

        if (!products.length) {
          return res.status(404).json({
            success: false,
            message: "Pending product not found"
          });
        }

        const vendorId =
          products[0].vendor_id;


        db.query(
          `
          UPDATE products
          SET status = 'rejected'
          WHERE id = ?
          `,
          [id],
          (updateErr) => {

            if (updateErr) {
              return res.status(500).json({
                success: false,
                message: "Product rejection failed"
              });
            }


            db.query(
              `
              INSERT INTO notifications
              (user_id, message, type)
              VALUES (?, ?, ?)
              `,
              [
                vendorId,
                "Your product was rejected ❌",
                "product"
              ]
            );


            res.json({
              success: true,
              message: "Product rejected"
            });

          }
        );

      }
    );

  }
);


/* =========================================================
   APPROVE VENDOR
========================================================= */

router.post(
  "/vendors/approve/:id",
  verifyAdmin,
  (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID"
      });
    }

    db.query(
      `
      UPDATE users
      SET status = 'approved'
      WHERE id = ?
      AND role = 'vendor'
      AND status = 'pending'
      `,
      [id],
      (err, result) => {

        if (err) {
          return res.status(500).json({
            success: false,
            message: "Vendor approval failed"
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Pending vendor not found"
          });
        }


        db.query(
          `
          INSERT INTO notifications
          (user_id, message, type)
          VALUES (?, ?, ?)
          `,
          [
            id,
            "Your vendor account has been approved 🎉",
            "vendor"
          ]
        );


        res.json({
          success: true,
          message: "Vendor approved"
        });

      }
    );

  }
);


/* =========================================================
   REJECT VENDOR
========================================================= */

router.post(
  "/vendors/reject/:id",
  verifyAdmin,
  (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID"
      });
    }

    db.query(
      `
      UPDATE users
      SET status = 'rejected'
      WHERE id = ?
      AND role = 'vendor'
      AND status = 'pending'
      `,
      [id],
      (err, result) => {

        if (err) {
          return res.status(500).json({
            success: false,
            message: "Vendor rejection failed"
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Pending vendor not found"
          });
        }


        db.query(
          `
          INSERT INTO notifications
          (user_id, message, type)
          VALUES (?, ?, ?)
          `,
          [
            id,
            "Your vendor application was rejected ❌",
            "vendor"
          ]
        );


        res.json({
          success: true,
          message: "Vendor rejected"
        });

      }
    );

  }
);


module.exports = router;