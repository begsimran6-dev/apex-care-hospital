const API_BASE = window.__API_BASE__ || "/api";

async function api(path, options = {}) {
  const headers = {"Content-Type":"application/json", ...(options.headers || {})};
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {...options, headers});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#039;"
  }[c]));
}


async function loadDashboard() {
  const welcome = document.getElementById("welcome");
  if (!welcome) return;

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {}

  welcome.textContent = user?.name
    ? `Welcome, ${user.name}!`
    : "Welcome to APEX Care Hospital";

  const appointments = document.getElementById("appointments");
  if (!appointments) return;

  try {
    const data = await api("/appointments");

    appointments.innerHTML = "<h2>My Appointments</h2>" +
      (data.length ? data.map(a => `
        <article class="card">
          <h3>Appointment #${escapeHtml(a.id)}</h3>
          <p>Doctor: ${escapeHtml(a.doctor_name)}</p>
          <p>Specialization: ${escapeHtml(a.specialization)}</p>
          <p>Date: ${escapeHtml(new Date(a.appointment_date).toLocaleString("en-IN", {day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true, timeZone:"Asia/Kolkata"}))}</p>
          <p>Reason: ${escapeHtml(a.reason || "Not provided")}</p>
          <p>Status: ${escapeHtml(a.status)}</p>
          ${a.status === "booked" ? `<button type="button" class="cancel-appointment" data-id="${escapeHtml(a.id)}">Cancel Appointment</button>` : ""}
        </article>
      `).join("") : "<p>No appointments booked yet.</p>");
  } catch (e) {
    appointments.innerHTML = `<p>${escapeHtml(e.message)}</p>`;
  }

  if (user?.role === "admin") {
    appointments.innerHTML += '<section id="admin-appointments"><h2>Admin: All Appointments</h2><p>Loading appointments...</p></section>';


    const adminPanel = document.getElementById("admin-appointments");

    let statsHtml = "";
    try {
      const stats = await api("/admin/stats");
      const cards = [
        ["Total Patients", stats.totalPatients],
        ["Total Doctors", stats.totalDoctors],
        ["Total Appointments", stats.totalAppointments],
        ["Pending", stats.pendingAppointments],
        ["Confirmed", stats.confirmedAppointments],
        ["Completed", stats.completedAppointments],
        ["Cancelled", stats.cancelledAppointments]
      ];

      statsHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0;">
        ${cards.map(([label, value]) => `
          <article class="card">
            <h3>${escapeHtml(label)}</h3>
            <p>${escapeHtml(value)}</p>
          </article>
        `).join("")}
      </div>`;
    } catch (e) {
      statsHtml = `<p>Statistics: ${escapeHtml(e.message)}</p>`;
    }

    let patientsHtml = "";
    try {
      const patients = await api("/admin/patients");

      patientsHtml = `
        <section class="card" style="margin:16px 0;">
          <h2>Registered Patients</h2>
          ${patients.length ? `
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                <thead>
                  <tr>
                    <th style="width:22%;padding:12px 8px;text-align:left;border-bottom:2px solid #ddd;">Name</th>
                    <th style="width:43%;padding:12px 8px;text-align:left;border-bottom:2px solid #ddd;">Email</th>
                    <th style="width:35%;padding:12px 8px;text-align:left;border-bottom:2px solid #ddd;">Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${patients.map(p => `
                    <tr>
                      <td style="padding:12px 8px;border-bottom:1px solid #ddd;overflow-wrap:anywhere;">${escapeHtml(p.name)}</td>
                      <td style="padding:12px 8px;border-bottom:1px solid #ddd;overflow-wrap:anywhere;">${escapeHtml(p.email)}</td>
                      <td style="padding:12px 8px;border-bottom:1px solid #ddd;overflow-wrap:anywhere;">${escapeHtml(new Date(p.created_at).toLocaleDateString("en-IN"))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : "<p>No registered patients found.</p>"}
        </section>
      `;
    } catch (e) {
      patientsHtml = `<p>Patients: ${escapeHtml(e.message)}</p>`;
    }

    let doctorsHtml = "";
    try {
      const doctors = await api("/admin/doctors");
      const departments = await api("/departments");

      doctorsHtml = `
        <section class="card" style="margin:16px 0;">
          <h2>Doctors Management</h2>

          <article class="card" style="padding:14px;margin:12px 0;">
            <h3>Add New Doctor</h3>
            <input id="new-doctor-name" placeholder="Doctor Name" maxlength="100" required>
            <input id="new-doctor-specialization" placeholder="Specialization" maxlength="150" required>
            <input id="new-doctor-qualification" placeholder="Qualification" maxlength="255">
            <input id="new-doctor-experience" type="number" min="0" step="1" placeholder="Experience in years" value="0">
            <select id="new-doctor-department" required>
              <option value="">Select Department</option>
              ${departments.map(dep => `<option value="${escapeHtml(dep.id)}">${escapeHtml(dep.name)}</option>`).join("")}
            </select>
            <button type="button" id="add-doctor-button">Save Doctor</button>
            <p id="add-doctor-message"></p>
          </article>

          ${doctors.length ? doctors.map(d => {
            const isActive = Boolean(d.active);
            return `
              <article class="card" style="margin:12px 0;padding:14px;">
                <h3>${escapeHtml(d.name)}</h3>
                <p>Specialization: ${escapeHtml(d.specialization || "Not available")}</p>
                <p>Department: ${escapeHtml(d.department_name || "Not available")}</p>
                <p>Qualification: ${escapeHtml(d.qualification || "Not available")}</p>
                <p>Experience: ${escapeHtml(d.experience_years ?? "Not available")} years</p>
                <p>Status: <strong>${isActive ? "Active" : "Inactive"}</strong></p>
                <button type="button" class="admin-doctor-status"
                  data-id="${escapeHtml(d.id)}"
                  data-active="${isActive ? "false" : "true"}">
                  ${isActive ? "Deactivate Doctor" : "Activate Doctor"}
                </button>
              </article>
            `;
          }).join("") : "<p>No doctors found.</p>"}
        </section>
      `;
    } catch (e) {
      doctorsHtml = `<p>Doctors: ${escapeHtml(e.message)}</p>`;
    }

    try {
      const all = await api("/admin/appointments");

      adminPanel.innerHTML = "<h2>Admin: All Appointments</h2>" + statsHtml + patientsHtml + doctorsHtml +
        (all.length ? all.map(a => `
          <article class="card">
            <h3>Appointment #${escapeHtml(a.id)}</h3>
            <p>Patient: ${escapeHtml(a.patient_name)}</p>
            <p>Doctor: ${escapeHtml(a.doctor_name)}</p>
            <p>Specialization: ${escapeHtml(a.specialization || "Not available")}</p>
            <p>Date: ${escapeHtml(new Date(a.appointment_date).toLocaleString("en-IN", {day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true, timeZone:"Asia/Kolkata"}))}</p>
            <p>Reason: ${escapeHtml(a.reason || "Not provided")}</p>
            <p>Status: ${escapeHtml(a.status)}</p>
            ${a.status === "booked" ? `<button type="button" class="admin-status" data-id="${escapeHtml(a.id)}" data-status="confirmed">Confirm Appointment</button>` : ""}
            ${a.status === "confirmed" ? `<button type="button" class="admin-status" data-id="${escapeHtml(a.id)}" data-status="completed">Mark Completed</button>` : ""}
          </article>
        `).join("") : "<p>No appointments found.</p>");
    } catch (e) {
      adminPanel.innerHTML = `<h2>Admin: All Appointments</h2><p>${escapeHtml(e.message)}</p>`;
    }
  }

  appointments.onclick = async (event) => {
    const cancelButton = event.target.closest(".cancel-appointment");
    const adminButton = event.target.closest(".admin-status");
    const doctorButton = event.target.closest(".admin-doctor-status");
    const addDoctorButton = event.target.closest("#add-doctor-button");

    if (addDoctorButton) {
      const name = document.getElementById("new-doctor-name").value.trim();
      const specialization = document.getElementById("new-doctor-specialization").value.trim();
      const qualification = document.getElementById("new-doctor-qualification").value.trim();
      const experience_years = Number(document.getElementById("new-doctor-experience").value);
      const department_id = Number(document.getElementById("new-doctor-department").value);
      const message = document.getElementById("add-doctor-message");

      if (!name || !specialization || !department_id ||
          !Number.isInteger(experience_years) || experience_years < 0) {
        message.textContent = "Please enter valid doctor details.";
        return;
      }

      addDoctorButton.disabled = true;
      try {
        await api("/admin/doctors", {
          method: "POST",
          body: JSON.stringify({name, specialization, qualification, experience_years, department_id})
        });
        alert("Doctor added successfully.");
        await loadDashboard();
      } catch (e) {
        message.textContent = e.message;
        addDoctorButton.disabled = false;
      }
      return;
    }

    if (cancelButton) {
      if (!confirm("Are you sure you want to cancel this appointment?")) return;

      cancelButton.disabled = true;
      try {
        await api(`/appointments/${cancelButton.dataset.id}/cancel`, {method: "PATCH"});
        await loadDashboard();
      } catch (e) {
        alert(e.message);
        cancelButton.disabled = false;
      }
      return;
    }

    if (doctorButton) {
      const active = doctorButton.dataset.active === "true";
      doctorButton.disabled = true;

      try {
        await api(`/admin/doctors/${doctorButton.dataset.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({active})
        });
        await loadDashboard();
      } catch (e) {
        alert(e.message);
        doctorButton.disabled = false;
      }
      return;
    }

    if (adminButton) {
      const status = adminButton.dataset.status;
      const action = status === "confirmed" ? "confirm" : "mark as completed";

      if (!confirm(`Are you sure you want to ${action} this appointment?`)) return;

      adminButton.disabled = true;
      try {
        await api(`/admin/appointments/${adminButton.dataset.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({status})
        });
        await loadDashboard();
      } catch (e) {
        alert(e.message);
        adminButton.disabled = false;
      }
    }
  };
}

async function loadCards() {
  for (const [id, path, render] of [
    ["doctors", "/doctors", d =>
      `<article class="card"><h3>${escapeHtml(d.name)}</h3><p>${escapeHtml(d.specialization)}</p><p>Department: ${escapeHtml(d.department_name)}</p></article>`],
    ["departments", "/departments", d =>
      `<article class="card"><h3>${escapeHtml(d.name)}</h3><p>${escapeHtml(d.description || "")}</p><p>Hours: ${escapeHtml(d.timings || "See hospital desk")}</p></article>`]
  ]) {
    const el = document.getElementById(id);
    if (!el) continue;
    try {
      const data = await api(path);
      el.innerHTML = data.map(render).join("");
    } catch (e) {
      el.textContent = e.message;
    }
  }
}

async function contactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const status = document.getElementById("status");
    try {
      await api("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          message: form.message.value
        })
      });
      status.textContent = "Message submitted.";
      form.reset();
    } catch (err) {
      status.textContent = err.message;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadCards();
  contactForm();
});
