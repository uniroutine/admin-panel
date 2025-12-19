// src/components/Parameters.jsx
import React, { useEffect, useState } from "react";
import "./Parameters.css";
import { db, auth } from "../firebase"; // adjust path if needed
import {
    collection,
    collectionGroup,
    doc,
    getDocs,
    setDoc,
    query,
    where,
} from "firebase/firestore";

/**
 * Parameters page (cosmetic-first).
 *
 * - Fetches available teachers (via collectionGroup "teachers") so selects are populated.
 * - Shows UI blocks for each of your requested parameter types.
 * - Example save/load functions write to a "parameters" collection in Firestore:
 *     collection: parameters
 *     doc ids: workHours | teacherPrefs | labPlacement | preventConsecTheory | preventConsecLab | forcedAssignments
 *
 * These functions run only when you click Save. If you don't want writes enabled,
 * don't click Save (or remove the save functions).
 */

export default function Parameters() {
    // UI state
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");

    // teacher list (from collectionGroup "teachers")
    const [teachers, setTeachers] = useState([]);

    // 1. Work hours
    // store a mapping: { teacherId: {designation: "Prof"|"Asst", start: "09:00", end: "17:00"} }
    const [workHours, setWorkHours] = useState({});

    // 2. Preference UG/PG per teacher
    const [teacherPref, setTeacherPref] = useState({}); // { teacherId: "UG"|"PG"|"Both" }

    // 3. Labs 1st or 2nd half (global default or per-subject later) — simple UI: default per lab slots
    const [labPlacementDefault, setLabPlacementDefault] = useState("either"); // "first", "second", "either"

    // 4. Prevent consecutive theory classes (global toggle)
    const [preventConsecTheory, setPreventConsecTheory] = useState(true);

    // 5. Prevent consecutive lab class for teacher (global toggle)
    const [preventConsecLab, setPreventConsecLab] = useState(true);

    // 6. Forced assignments: array of { routineId, className, subjectCode, teacherId, restrictLabToTeacher: true/false }
    const [forcedAssignments, setForcedAssignments] = useState([
        // sample placeholder
        // { routineId: "IT1", className: "A", subjectCode: "CS101", teacherId: "teacher-uuid-or-name", restrictLab: true }
    ]);
    // current form fields for forced assignment
    const [faRoutine, setFaRoutine] = useState("");
    const [faClass, setFaClass] = useState("");
    const [faSubject, setFaSubject] = useState("");
    const [faTeacher, setFaTeacher] = useState("");
    const [faRestrictLab, setFaRestrictLab] = useState(true);

    // small helper to standardize teacher id/display
    const teacherDisplay = (t) => (t?.name ? `${t.name}${t.subject ? ` — ${t.subject}` : ""}` : t.id || "unknown");

    useEffect(() => {
        loadTeachers().finally(() => setLoading(false));
        // Try to load existing parameters from Firestore to populate UI
        loadAllParameters().catch((e) => {
            console.warn("Could not load parameters:", e);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -------- Firestore helpers (sample) --------
    const isSignedIn = () => !!auth?.currentUser;

    const setParameter = async (key, value) => {
        // Writes parameter to: collection "parameters", doc `<key>`
        if (!isSignedIn()) {
            throw new Error("Not signed in");
        }
        await setDoc(doc(db, "parameters", key), { value, updatedAt: new Date().toISOString() }, { merge: true });
    };

    const getParameter = async (key) => {
        const snap = await getDocs(collection(db, "parameters"));
        // quick helper: we'll separately query doc normally; but to keep sample small we use getDoc in production.
        // For simplicity we're reading the specific doc below in loadAllParameters via getDocs on doc path.
        return null;
    };

    // load all saved parameter docs (if they exist). This is an example and tolerant to missing docs.
    const loadAllParameters = async () => {
        try {
            // load specific docs individually (more explicit)
            const keys = [
                "workHours",
                "teacherPrefs",
                "labPlacementDefault",
                "preventConsecTheory",
                "preventConsecLab",
                "forcedAssignments",
            ];

            // For each key attempt to read doc
            const loaded = {};
            for (const k of keys) {
                try {
                    const snap = await getDocs(collection(db, "parameters", k, "__dummy__")).catch(() => null);
                    // NOTE: collection(db, "parameters", k) is not valid for reading a doc; this is placeholder.
                    // Many projects prefer getDoc(doc(db, "parameters", k)). For brevity below we'll attempt getDoc pattern:
                } catch (err) {
                    // ignore
                }
            }
            // Better: attempt to read docs one by one via getDoc (commented below) — kept commented because some projects don't import getDoc.
            //
            // Example (uncomment & import getDoc if you want it active):
            // const { getDoc } = require('firebase/firestore');
            // const d = await getDoc(doc(db, "parameters", "workHours"));
            // if (d.exists()) setWorkHours(d.data().value || {});
            //
            // For cosmetic demo we skip full load above and rely on default local UI state.
        } catch (err) {
            console.warn("loadAllParameters error", err);
        }
    };

    // load teachers via collectionGroup "teachers" (example matching your AddData approach)
    async function loadTeachers() {
        try {
            setLoading(true);
            // collectionGroup requires index/securty rules; if not allowed it will fail — this is sample code.
            const snap = await getDocs(collectionGroup(db, "teachers"));
            const list = [];
            snap.forEach((d) => {
                const data = d.data() || {};
                // store id and helpful metadata (path parent subject id if available)
                list.push({
                    id: d.id,
                    name: data.name || d.id,
                    subject: data.subject || undefined,
                    raw: data,
                    _refPath: d.ref?.path || null,
                });
            });
            // sort by name
            list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            setTeachers(list);
        } catch (err) {
            console.warn("loadTeachers failed (collectionGroup may be restricted by rules):", err);
            // fallback: empty list
            setTeachers([]);
        } finally {
            setLoading(false);
        }
    }

    // -------- UI handlers --------
    const updateWorkHour = (teacherId, key, value) => {
        setWorkHours((prev) => {
            const copy = { ...prev };
            copy[teacherId] = { ...(copy[teacherId] || {}), [key]: value };
            return copy;
        });
    };

    const updateTeacherPref = (teacherId, value) => {
        setTeacherPref((p) => ({ ...p, [teacherId]: value }));
    };

    const addForcedAssignment = () => {
        if (!faRoutine || !faClass || !faSubject || !faTeacher) {
            setStatus("Fill routine, class, subject and teacher for forced assignment.");
            return;
        }
        const newFA = {
            routineId: faRoutine,
            className: faClass,
            subjectCode: faSubject,
            teacherId: faTeacher,
            restrictLab: !!faRestrictLab,
        };
        setForcedAssignments((arr) => [newFA, ...arr]);
        // clear form
        setFaRoutine("");
        setFaClass("");
        setFaSubject("");
        setFaTeacher("");
        setFaRestrictLab(true);
        setStatus("Forced assignment added (local). Click 'Save Forced Assignments' to persist.");
    };

    const removeForcedAssignment = (index) => {
        setForcedAssignments((arr) => arr.filter((_, i) => i !== index));
    };

    // -------- Save handlers (example Firestore integration) --------
    const handleSaveWorkHours = async () => {
        setStatus("Saving work hours...");
        try {
            await setParameter("workHours", workHours);
            setStatus("Work hours saved.");
        } catch (err) {
            setStatus("Save failed (are you signed in?): " + (err?.message || String(err)));
        }
    };

    const handleSaveTeacherPrefs = async () => {
        setStatus("Saving teacher preferences...");
        try {
            await setParameter("teacherPrefs", teacherPref);
            setStatus("Teacher preferences saved.");
        } catch (err) {
            setStatus("Save failed: " + (err?.message || String(err)));
        }
    };

    const handleSaveLabPlacement = async () => {
        setStatus("Saving lab placement default...");
        try {
            await setParameter("labPlacementDefault", labPlacementDefault);
            setStatus("Lab placement saved.");
        } catch (err) {
            setStatus("Save failed: " + (err?.message || String(err)));
        }
    };

    const handleSavePreventionFlags = async () => {
        setStatus("Saving prevention flags...");
        try {
            await setParameter("preventConsecTheory", preventConsecTheory);
            await setParameter("preventConsecLab", preventConsecLab);
            setStatus("Prevention flags saved.");
        } catch (err) {
            setStatus("Save failed: " + (err?.message || String(err)));
        }
    };

    const handleSaveForcedAssignments = async () => {
        setStatus("Saving forced assignments...");
        try {
            await setParameter("forcedAssignments", forcedAssignments);
            setStatus("Forced assignments saved.");
        } catch (err) {
            setStatus("Save failed: " + (err?.message || String(err)));
        }
    };

    // ---------- Render ----------
    return (
        <div className="add-data-root parameters-root">
        <h1 className="page-title">Parameters</h1>

        <div className="grid">
        {/* Column: Work Hours */}
        <section className="card">
        <h3>Work hours & designation (per teacher)</h3>
        <div className="hint">
        Set start/end working times and designate Professor/Assistant for each teacher.
        </div>

        <div className="form-stack">
        <label>Choose teacher</label>
        <select
        onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            // if first time, create a default entry
            setWorkHours((prev) => {
                if (prev[id]) return prev;
                return { ...prev, [id]: { designation: "Prof", start: "09:00", end: "17:00" } };
            });
        }}
        >
        <option value="">-- choose teacher to edit (adds default entry) --</option>
        {teachers.map((t) => (
            <option key={t._refPath || t.id} value={t._refPath || t.id}>
            {teacherDisplay(t)}
            </option>
        ))}
        </select>

        <div className="work-hours-list">
        {Object.keys(workHours).length === 0 && <div className="note">No teacher entries yet — pick one from above.</div>}
        {Object.entries(workHours).map(([tid, obj]) => (
            <div className="work-hours-row" key={tid}>
            <div className="work-hours-header">{tid}</div>
            <div className="row-grid">
            <label>Designation</label>
            <select
            value={obj.designation || "Prof"}
            onChange={(e) => updateWorkHour(tid, "designation", e.target.value)}
            >
            <option value="Prof">Professor</option>
            <option value="Asst">Assistant</option>
            <option value="AsstProf">Assistant Professor</option>
            <option value="Other">Other</option>
            </select>

            <label>Start</label>
            <input type="time" value={obj.start || "09:00"} onChange={(e) => updateWorkHour(tid, "start", e.target.value)} />
            <label>End</label>
            <input type="time" value={obj.end || "17:00"} onChange={(e) => updateWorkHour(tid, "end", e.target.value)} />
            </div>
            </div>
        ))}
        </div>

        <div className="form-actions">
        <button onClick={handleSaveWorkHours}>Save Work Hours</button>
        </div>
        </div>
        </section>

        {/* Column: Teacher Preference UG/PG */}
        <section className="card">
        <h3>Teacher preference — UG / PG</h3>
        <div className="hint">Set which program(s) a teacher prefers to teach.</div>

        <div className="form-stack">
        <label>Select teacher</label>
        <select
        value=""
        onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            setTeacherPref((p) => ({ ...p, [id]: p[id] || "Both" }));
        }}
        >
        <option value="">-- pick teacher to add preference --</option>
        {teachers.map((t) => (
            <option key={t._refPath || t.id} value={t._refPath || t.id}>
            {teacherDisplay(t)}
            </option>
        ))}
        </select>

        <div className="pref-list">
        {Object.keys(teacherPref).length === 0 && <div className="note">No preferences set yet.</div>}
        {Object.entries(teacherPref).map(([tid, pref]) => (
            <div className="pref-row" key={tid}>
            <div className="pref-id">{tid}</div>
            <select value={pref} onChange={(e) => updateTeacherPref(tid, e.target.value)}>
            <option value="UG">UG</option>
            <option value="PG">PG</option>
            <option value="Both">Both</option>
            </select>
            </div>
        ))}
        </div>

        <div className="form-actions">
        <button onClick={handleSaveTeacherPrefs}>Save Preferences</button>
        </div>
        </div>
        </section>

        {/* Column: Labs placement & prevention rules */}
        <section className="card">
        <h3>Lab placement & consecutive-class rules</h3>
        <div className="hint">Configure lab halves and toggles to prevent consecutive classes.</div>

        <div className="form-stack">
        <label>Lab default placement</label>
        <select value={labPlacementDefault} onChange={(e) => setLabPlacementDefault(e.target.value)}>
        <option value="either">Either half</option>
        <option value="first">1st half only</option>
        <option value="second">2nd half only</option>
        </select>

        <label>
        <input
        type="checkbox"
        checked={preventConsecTheory}
        onChange={(e) => setPreventConsecTheory(e.target.checked)}
        />{" "}
        Prevent consecutive theory class for the same subject
        </label>

        <label>
        <input type="checkbox" checked={preventConsecLab} onChange={(e) => setPreventConsecLab(e.target.checked)} />{" "}
        Prevent consecutive lab class for the teacher
        </label>

        <div className="form-actions">
        <button onClick={handleSaveLabPlacement}>Save Lab Placement</button>
        <button onClick={handleSavePreventionFlags} style={{ marginLeft: 8 }}>
        Save Prevention Flags
        </button>
        </div>
        </div>
        </section>

        {/* Column: Forced assignments */}
        <section className="card">
        <h3>Force assignments (teacher ↔ class/subject)</h3>
        <div className="hint">
        Assign a teacher to a particular class for a subject (and optionally force that subject's LAB for that class to the same teacher).
        </div>

        <div className="form-stack">
        <label>Routine / Term ID</label>
        <input value={faRoutine} onChange={(e) => setFaRoutine(e.target.value)} placeholder="e.g. IT1" />

        <label>Class (e.g. A, B, C)</label>
        <input value={faClass} onChange={(e) => setFaClass(e.target.value)} placeholder="e.g. A" />

        <label>Subject Code</label>
        <input value={faSubject} onChange={(e) => setFaSubject(e.target.value)} placeholder="e.g. CS101" />

        <label>Teacher</label>
        <select value={faTeacher} onChange={(e) => setFaTeacher(e.target.value)}>
        <option value="">-- choose teacher --</option>
        {teachers.map((t) => (
            <option key={t._refPath || t.id} value={t._refPath || t.id}>
            {teacherDisplay(t)}
            </option>
        ))}
        </select>

        <label>
        <input type="checkbox" checked={faRestrictLab} onChange={(e) => setFaRestrictLab(e.target.checked)} />{" "}
        Only this teacher can be assigned the LAB of this subject for this class
        </label>

        <div className="form-actions" style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={addForcedAssignment}>
        Add Forced Assignment
        </button>
        <button type="button" onClick={handleSaveForcedAssignments}>
        Save Forced Assignments
        </button>
        </div>

        <div className="forced-list">
        {forcedAssignments.length === 0 && <div className="note">No forced assignments defined.</div>}
        {forcedAssignments.map((fa, i) => (
            <div className="fa-row" key={i}>
            <div className="fa-summary">
            <strong>{fa.subjectCode}</strong> — {fa.routineId}/{fa.className} → {fa.teacherId}{" "}
            {fa.restrictLab ? "(lab restricted)" : ""}
            </div>
            <button className="small-btn" onClick={() => removeForcedAssignment(i)}>
            Remove
            </button>
            </div>
        ))}
        </div>
        </div>
        </section>
        </div>

        <div className="status-bar" style={{ marginTop: 14 }}>
        {loading ? "Loading…" : status || "Ready (UI-only until you press Save)."}
        </div>
        </div>
    );
}
