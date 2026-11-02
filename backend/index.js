require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const bedrock = new BedrockRuntimeClient({ region: "ap-south-1" });
const aiRequestCounts = new Map();


const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

app.get("/", (req, res) => {
  res.json({ message: "Mediai backend is running" });
});

app.get("/api/db-check", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS database_name");
    res.json({ connected: true, database: rows[0].database_name });
  } catch (error) {
    console.error("Database check failed:", error.code);
    res.status(500).json({ connected: false });
  }
});

// CONTACT API
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !message.trim() ||
      name.trim().length > 100 ||
      email.trim().length > 255 ||
      message.trim().length > 1000 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({ message: "Please enter valid contact details." });
    }

    await db.execute(
      "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
      [name.trim(), email.trim().toLowerCase(), message.trim()]
    );

    res.status(201).json({ message: "Your message has been submitted successfully." });
  } catch (error) {
    console.error("Contact submission failed:", error.code);
    res.status(500).json({ message: "Unable to submit your message right now." });
  }
});

// REGISTER API
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({
        message: "Enter name, email and password (minimum 8 characters)."
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name.trim(), normalizedEmail, passwordHash]
    );

    const token = jwt.sign(
      { id: result.insertId, email: normalizedEmail },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.status(201).json({ message: "Registration successful", token });

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already registered." });
    }
    console.error("Register error:", error.code);
    res.status(500).json({ message: "Registration failed." });
  }
});

// LOGIN API
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Enter email and password." });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await db.execute(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error("Login error:", error.code);
    res.status(500).json({ message: "Login failed." });
  }
});


// JWT AUTHENTICATION
function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ")
    ? header.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Please login first." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired login. Please login again." });
  }
}


// ADMIN AUTHORIZATION
async function requireAdmin(req, res, next) {
  try {
    const [rows] = await db.execute(
      "SELECT role FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!rows.length || rows[0].role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error.code);
    res.status(500).json({ message: "Unable to verify admin access." });
  }
}

// GET ACTIVE DOCTORS
app.get("/api/doctors", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.id, d.name, d.specialization, dep.name AS department_name
       FROM doctors d
       JOIN departments dep ON d.department_id = dep.id
       WHERE d.active = TRUE`
    );
    res.json(rows);
  } catch (error) {
    console.error("Doctors API error:", error.code);
    res.status(500).json({ message: "Unable to load doctors." });
  }
});

// BOOK APPOINTMENT
app.post("/api/appointments", authenticateToken, async (req, res) => {
  try {
    const { doctor_id, appointment_date, reason } = req.body;

    const doctorId = Number(doctor_id);
    const date = new Date(appointment_date);

    if (!Number.isInteger(doctorId) || doctorId < 1 ||
        !appointment_date || Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: "Enter a valid doctor and appointment date." });
    }

    if (date <= new Date()) {
      return res.status(400).json({ message: "Appointment date must be in the future." });
    }

    const [doctors] = await db.execute(
      "SELECT id FROM doctors WHERE id = ? AND active = TRUE",
      [doctorId]
    );

    if (doctors.length === 0) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const [result] = await db.execute(
      `INSERT INTO appointments
       (user_id, doctor_id, appointment_date, reason)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, doctorId, appointment_date.replace("T", " "), reason || null]
    );

    res.status(201).json({
      message: "Appointment booked successfully.",
      id: result.insertId
    });
  } catch (error) {
    console.error("Appointment booking error:", error.code);
    res.status(500).json({ message: "Unable to book appointment." });
  }
});

// GET LOGGED-IN USER APPOINTMENTS
app.get("/api/appointments", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.id, a.appointment_date, a.reason, a.status,
              d.name AS doctor_name, d.specialization
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Appointments list error:", error.code);
    res.status(500).json({ message: "Unable to load appointments." });
  }
});



// CANCEL LOGGED-IN USER APPOINTMENT
app.patch("/api/appointments/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId < 1) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }

    const [result] = await db.execute(
      `UPDATE appointments
       SET status = 'cancelled'
       WHERE id = ? AND user_id = ? AND status = 'booked'`,
      [appointmentId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Appointment not found or already cancelled."
      });
    }

    res.json({ message: "Appointment cancelled successfully." });
  } catch (error) {
    console.error("Appointment cancellation error:", error.code);
    res.status(500).json({ message: "Unable to cancel appointment." });
  }
});



// ADMIN: GET ALL APPOINTMENTS
app.get("/api/admin/appointments", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        a.id,
        u.name AS patient_name,
        u.email AS patient_email,
        d.name AS doctor_name,
        dep.name AS specialization,
        a.appointment_date,
        a.reason,
        a.status
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN departments dep ON d.department_id = dep.id
      ORDER BY a.appointment_date DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Admin appointments error:", error.code);
    res.status(500).json({ message: "Unable to load appointments." });
  }
});


// ADMIN DASHBOARD STATISTICS
app.get("/api/admin/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'patient') AS totalPatients,
        (SELECT COUNT(*) FROM doctors WHERE active = TRUE) AS totalDoctors,
        (SELECT COUNT(*) FROM appointments) AS totalAppointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'booked') AS pendingAppointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'confirmed') AS confirmedAppointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'completed') AS completedAppointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'cancelled') AS cancelledAppointments
    `);

    res.json(rows[0]);
  } catch (error) {
    console.error("Admin statistics error:", error.code);
    res.status(500).json({ message: "Unable to load dashboard statistics." });
  }
});

// ADMIN: GET REGISTERED PATIENTS
app.get("/api/admin/patients", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, name, email, created_at
      FROM users
      WHERE role = 'patient'
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Admin patients error:", error.code);
    res.status(500).json({ message: "Unable to load patients." });
  }
});

// GET ACTIVE DEPARTMENTS
app.get("/api/departments", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, name, description, timings FROM departments WHERE active = 1 ORDER BY name"
    );
    res.json(rows);
  } catch (error) {
    console.error("Departments error:", error.code);
    res.status(500).json({ message: "Unable to load departments." });
  }
});

// ADMIN: GET ALL DOCTORS
app.get("/api/admin/doctors", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.id, d.name, d.specialization, d.qualification,
             d.experience_years, d.active,
             dep.name AS department_name
      FROM doctors d
      JOIN departments dep ON d.department_id = dep.id
      ORDER BY d.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Admin doctors error:", error.code);
    res.status(500).json({ message: "Unable to load doctors." });
  }
});

// ADMIN: ADD NEW DOCTOR
app.post("/api/admin/doctors", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { department_id, name, specialization, qualification, experience_years } = req.body;
    const departmentId = Number(department_id);
    const experience = Number(experience_years ?? 0);

    if (!Number.isInteger(departmentId) || departmentId < 1 ||
        !name?.trim() || !specialization?.trim() ||
        !Number.isInteger(experience) || experience < 0) {
      return res.status(400).json({ message: "Please provide valid doctor details." });
    }

    const [result] = await db.execute(
      `INSERT INTO doctors
       (department_id, name, specialization, qualification, experience_years, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [departmentId, name.trim(), specialization.trim(),
       qualification?.trim() || null, experience]
    );

    res.status(201).json({
      message: "Doctor added successfully.",
      doctorId: result.insertId
    });
  } catch (error) {
    console.error("Add doctor error:", error.code);
    res.status(500).json({ message: "Unable to add doctor." });
  }
});

// ADMIN: UPDATE DOCTOR ACTIVE STATUS
app.patch("/api/admin/doctors/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const { active } = req.body;

    if (!Number.isInteger(doctorId) || doctorId < 1 ||
        typeof active !== "boolean") {
      return res.status(400).json({ message: "Invalid doctor ID or status." });
    }

    const [result] = await db.execute(
      "UPDATE doctors SET active = ? WHERE id = ?",
      [active, doctorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    res.json({ message: "Doctor status updated successfully.", active });
  } catch (error) {
    console.error("Doctor status update error:", error.code);
    res.status(500).json({ message: "Unable to update doctor status." });
  }
});

// ADMIN UPDATE APPOINTMENT STATUS
app.patch("/api/admin/appointments/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(appointmentId) || appointmentId < 1) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }

    if (!["confirmed", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid appointment status." });
    }

    const previousStatus = status === "confirmed" ? "booked" : "confirmed";

    const [result] = await db.execute(
      "UPDATE appointments SET status = ? WHERE id = ? AND status = ?",
      [status, appointmentId, previousStatus]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        message: "Appointment not found or status transition not allowed."
      });
    }

    res.json({ message: "Appointment status updated successfully.", status });
  } catch (error) {
    console.error("Admin status update error:", error.code);
    res.status(500).json({ message: "Unable to update appointment status." });
  }
});


// AI ASSISTANT - authenticated, limited requests, public hospital information only
app.post("/api/ai/chat", authenticateToken, async (req, res) => {
  try {
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

    if (!message || message.length > 1000) {
      return res.status(400).json({ message: "Enter a message (maximum 1000 characters)." });
    }

    const now = Date.now();
    const recent = (aiRequestCounts.get(req.user.id) || [])
      .filter(time => now - time < 10 * 60 * 1000);

    if (recent.length >= 10) {
      return res.status(429).json({ message: "Please wait before sending more AI questions." });
    }

    recent.push(now);
    aiRequestCounts.set(req.user.id, recent);

    const [departments] = await db.query(
      "SELECT name FROM departments ORDER BY name"
    );

    const [doctors] = await db.query(`
      SELECT d.name, d.specialization, dep.name AS department_name
      FROM doctors d
      JOIN departments dep ON d.department_id = dep.id
      WHERE d.active = TRUE
      ORDER BY d.name
      LIMIT 30
    `);

    const hospitalInfo = JSON.stringify({
      departments: departments.map(row => row.name),
      activeDoctors: doctors
    });

    const response = await bedrock.send(new ConverseCommand({
      modelId: "global.amazon.nova-2-lite-v1:0",
      system: [{
        text: "You are the APEX Care Hospital general information assistant. Use only the supplied hospital information for hospital-specific answers. Do not invent timings, fees, contact details, doctors, or services. If information is unavailable, say so and suggest contacting hospital staff. You are not a doctor: do not diagnose, interpret symptoms or test results, or recommend medicines, doses, or treatments. For urgent medical concerns, advise contacting local emergency services and a qualified clinician immediately. Never request passwords, OTPs, tokens, or unnecessary personal patient information. Keep answers concise. Hospital information: " + hospitalInfo
      }],
      messages: [{
        role: "user",
        content: [{ text: message }]
      }],
      inferenceConfig: {
        maxTokens: 400,
        temperature: 0.3
      }
    }));

    const reply = response.output?.message?.content
      ?.map(item => item.text || "")
      .join("\\n")
      .trim();

    if (!reply) {
      return res.status(502).json({ message: "AI assistant returned no answer." });
    }

    res.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error.name || "UnknownError");
    res.status(502).json({ message: "AI assistant is temporarily unavailable. Please try again later." });
  }
});

const port = Number(process.env.PORT || 3000);

app.listen(port, "0.0.0.0", () => {
  console.log(`Mediai backend listening on port ${port}`);
});
