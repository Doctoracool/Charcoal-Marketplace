const router = require("express").Router();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const db = require("../config/db");

const SECRET =
  process.env.JWT_SECRET || "DEV_SECRET_CHANGE_ME";

/*
=========================================================
  PI SUPER ADMIN
=========================================================

  Set this in Railway Variables:

  PI_SUPER_ADMIN_USERNAME=DoctorACool1

=========================================================
*/

const PI_SUPER_ADMIN_USERNAME =
  process.env.PI_SUPER_ADMIN_USERNAME || "DoctorACool1";


/*
=========================================================
  TOKEN GENERATOR
=========================================================
*/

function createToken(user) {

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      admin_level: user.admin_level || "none"
    },
    SECRET,
    {
      expiresIn: "1d"
    }
  );

}


/*
=========================================================
  SAFE USER RESPONSE
=========================================================
*/

function publicUser(user) {

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    pi_uid: user.pi_uid || null,
    pi_username: user.pi_username || null,
    admin_level: user.admin_level || "none"
  };

}


/*
=========================================================
  VERIFY PI ACCOUNT
=========================================================
*/

async function verifyPiAccount(accessToken) {

  const response = await axios.get(
    "https://api.minepi.com/v2/me",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 8000
    }
  );

  const piUser = response.data;

  if (!piUser || !piUser.uid) {
    throw new Error("Invalid Pi account");
  }

  return piUser;

}


/*
=========================================================
  REGISTER VENDOR
=========================================================
*/

router.post("/register", (req, res) => {

  const {
    name,
    email,
    password
  } = req.body || {};


  if (!name || !email || !password) {

    return res.status(400).json({
      success: false,
      message: "All fields required"
    });

  }


  db.query(
    "SELECT id FROM users WHERE email=?",
    [email],

    async (err, result) => {

      if (err) {

        console.error(
          "Vendor registration DB error:",
          err
        );

        return res.status(500).json({
          success: false,
          message: "Database error"
        });

      }


      if (result.length > 0) {

        return res.status(409).json({
          success: false,
          message: "Email already exists"
        });

      }


      try {

        const hashed =
          await bcrypt.hash(password, 10);


        db.query(
          `
          INSERT INTO users
          (
            name,
            email,
            password,
            role,
            status,
            admin_level
          )
          VALUES (?,?,?,?,?,?)
          `,
          [
            name,
            email,
            hashed,
            "vendor",
            "pending",
            "none"
          ],

          (err2) => {

            if (err2) {

              console.error(
                "Vendor registration error:",
                err2
              );

              return res.status(500).json({
                success: false,
                message: "Register failed"
              });

            }


            return res.json({
              success: true,
              message:
                "Vendor submitted for approval"
            });

          }
        );


      } catch (error) {

        return res.status(500).json({
          success: false,
          message: "Encryption error"
        });

      }

    }
  );

});


/*
=========================================================
  EMAIL LOGIN
  LEGACY BUYER / VENDOR LOGIN
=========================================================
*/

router.post("/login", (req, res) => {

  const {
    email,
    password
  } = req.body || {};


  if (!email || !password) {

    return res.status(400).json({
      success: false,
      message: "Missing fields"
    });

  }


  db.query(
    "SELECT * FROM users WHERE email=? LIMIT 1",
    [email],

    async (err, result) => {

      if (err) {

        console.error(
          "Email login DB error:",
          err
        );

        return res.status(500).json({
          success: false,
          message: "Database error"
        });

      }


      if (!result.length) {

        return res.status(401).json({
          success: false,
          message: "User not found"
        });

      }


      const user = result[0];


      if (user.status !== "approved") {

        return res.status(403).json({
          success: false,
          message: "Account not approved"
        });

      }


      const match =
        await bcrypt.compare(
          password,
          user.password
        );


      if (!match) {

        return res.status(401).json({
          success: false,
          message: "Wrong password"
        });

      }


      const token =
        createToken(user);


      return res.json({

        success: true,

        token,

        user:
          publicUser(user)

      });

    }
  );

});


/*
=========================================================
  PI LOGIN
  NORMAL PI USERS / BUYERS
=========================================================
*/

router.post(
  "/pi-login",
  async (req, res) => {

    const {
      accessToken
    } = req.body || {};


    if (!accessToken) {

      return res.status(400).json({
        success: false,
        message: "Missing Pi access token"
      });

    }


    try {

      /*
      ---------------------------------------------
        VERIFY DIRECTLY WITH PI
      ---------------------------------------------
      */

      const piUser =
        await verifyPiAccount(
          accessToken
        );


      const verifiedUid =
        piUser.uid;


      const verifiedUsername =
        piUser.username ||
        "Pi User";


      const email =
        `${verifiedUid}@pi.app`;


      /*
      ---------------------------------------------
        CHECK EXISTING USER
      ---------------------------------------------
      */

      db.query(
        "SELECT * FROM users WHERE pi_uid=? LIMIT 1",
        [verifiedUid],

        (err, result) => {

          if (err) {

            console.error(
              "Pi login DB error:",
              err
            );

            return res.status(500).json({
              success: false,
              message: "Database error"
            });

          }


          /*
          =========================================
            EXISTING USER
          =========================================
          */

          if (result.length > 0) {

            const user =
              result[0];


            if (
              user.status !==
              "approved"
            ) {

              return res.status(403).json({
                success: false,
                message:
                  "Account not approved"
              });

            }


            const token =
              createToken(user);


            return res.json({

              success: true,

              token,

              user:
                publicUser(user)

            });

          }


          /*
          =========================================
            CREATE NEW PI BUYER
          =========================================
          */

          const hashed =
            bcrypt.hashSync(
              "PI_USER_INTERNAL",
              10
            );


          db.query(
            `
            INSERT INTO users
            (
              name,
              email,
              password,
              role,
              status,
              pi_uid,
              pi_username,
              admin_level
            )
            VALUES (?,?,?,?,?,?,?,?)
            `,
            [
              verifiedUsername,
              email,
              hashed,
              "buyer",
              "approved",
              verifiedUid,
              verifiedUsername,
              "none"
            ],

            (err2, insertResult) => {

              if (err2) {

                console.error(
                  "Pi user creation error:",
                  err2
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Failed to create Pi user"
                });

              }


              db.query(
                `
                SELECT *
                FROM users
                WHERE id=?
                LIMIT 1
                `,
                [insertResult.insertId],

                (err3, rows) => {

                  if (
                    err3 ||
                    !rows.length
                  ) {

                    return res.status(500).json({
                      success: false,
                      message:
                        "User fetch failed"
                    });

                  }


                  const user =
                    rows[0];


                  const token =
                    createToken(user);


                  return res.json({

                    success: true,

                    token,

                    user:
                      publicUser(user)

                  });

                }
              );

            }
          );

        }
      );


    } catch (error) {

      console.error(
        "Pi login error:",
        error.message
      );


      return res.status(401).json({

        success: false,

        message:
          "Pi authentication failed"

      });

    }

  }
);


/*
=========================================================
  PI SUPER ADMIN LOGIN
=========================================================

  ONLY DoctorACool1 can use this route
  to become the Super Admin.

=========================================================
*/

router.post(
  "/pi-admin-login",
  async (req, res) => {

    const {
      accessToken
    } = req.body || {};


    if (!accessToken) {

      return res.status(400).json({
        success: false,
        message:
          "Missing Pi access token"
      });

    }


    try {

      /*
      ---------------------------------------------
        VERIFY PI ACCOUNT
      ---------------------------------------------
      */

      const piUser =
        await verifyPiAccount(
          accessToken
        );


      const verifiedUid =
        piUser.uid;


      const verifiedUsername =
        piUser.username;


      /*
      ---------------------------------------------
        CHECK SUPER ADMIN USERNAME
      ---------------------------------------------
      */

      if (
        verifiedUsername !==
        PI_SUPER_ADMIN_USERNAME
      ) {

        return res.status(403).json({

          success: false,

          message:
            "This Pi account is not authorized as the Super Admin."

        });

      }


      const email =
        `${verifiedUid}@pi.app`;


      /*
      ---------------------------------------------
        CHECK EXISTING ACCOUNT
      ---------------------------------------------
      */

      db.query(
        `
        SELECT *
        FROM users
        WHERE pi_uid=?
        LIMIT 1
        `,
        [verifiedUid],

        (err, result) => {

          if (err) {

            console.error(
              "Pi Super Admin DB error:",
              err
            );

            return res.status(500).json({
              success: false,
              message:
                "Database error"
            });

          }


          /*
          =========================================
            SUPER ADMIN ALREADY EXISTS
          =========================================
          */

          if (result.length > 0) {

            const user =
              result[0];


            /*
            ---------------------------------------
              FORCE THIS SPECIFIC PI ACCOUNT TO
              REMAIN THE SUPER ADMIN
            ---------------------------------------
            */

            db.query(
              `
              UPDATE users
              SET
                name=?,
                email=?,
                role='admin',
                status='approved',
                pi_username=?,
                admin_level='super_admin'
              WHERE pi_uid=?
              `,
              [
                verifiedUsername,
                email,
                verifiedUsername,
                verifiedUid
              ],

              (updateErr) => {

                if (updateErr) {

                  console.error(
                    "Super Admin update error:",
                    updateErr
                  );

                  return res.status(500).json({
                    success: false,
                    message:
                      "Failed to authorize Super Admin"
                  });

                }


                db.query(
                  `
                  SELECT *
                  FROM users
                  WHERE pi_uid=?
                  LIMIT 1
                  `,
                  [verifiedUid],

                  (fetchErr, rows) => {

                    if (
                      fetchErr ||
                      !rows.length
                    ) {

                      return res.status(500).json({
                        success: false,
                        message:
                          "Super Admin fetch failed"
                      });

                    }


                    const admin =
                      rows[0];


                    const token =
                      createToken(admin);


                    return res.json({

                      success: true,

                      message:
                        "Super Admin login successful",

                      token,

                      user:
                        publicUser(admin)

                    });

                  }
                );

              }
            );

            return;

          }


          /*
          =========================================
            FIRST SUPER ADMIN CREATION
          =========================================

            DoctorACool1 is the designated
            Super Admin.

          =========================================
          */

          const hashed =
            bcrypt.hashSync(
              "PI_ADMIN_INTERNAL",
              10
            );


          db.query(
            `
            INSERT INTO users
            (
              name,
              email,
              password,
              role,
              status,
              pi_uid,
              pi_username,
              admin_level
            )
            VALUES (?,?,?,?,?,?,?,?)
            `,
            [
              verifiedUsername,
              email,
              hashed,
              "admin",
              "approved",
              verifiedUid,
              verifiedUsername,
              "super_admin"
            ],

            (insertErr, insertResult) => {

              if (insertErr) {

                console.error(
                  "Super Admin creation error:",
                  insertErr
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Failed to create Super Admin"
                });

              }


              db.query(
                `
                SELECT *
                FROM users
                WHERE id=?
                LIMIT 1
                `,
                [insertResult.insertId],

                (fetchErr, rows) => {

                  if (
                    fetchErr ||
                    !rows.length
                  ) {

                    return res.status(500).json({
                      success: false,
                      message:
                        "Super Admin fetch failed"
                    });

                  }


                  const admin =
                    rows[0];


                  const token =
                    createToken(admin);


                  return res.json({

                    success: true,

                    message:
                      "Super Admin created successfully",

                    token,

                    user:
                      publicUser(admin)

                  });

                }
              );

            }
          );

        }
      );


    } catch (error) {

      console.error(
        "Pi Super Admin verification error:",
        error.message
      );


      return res.status(401).json({

        success: false,

        message:
          "Pi account verification failed"

      });

    }

  }
);


/*
=========================================================
  MODULE EXPORT
=========================================================
*/

module.exports = router;